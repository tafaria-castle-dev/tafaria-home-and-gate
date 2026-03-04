<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Ramsey\Uuid\Uuid;
use App\Models\User;
use Carbon\Carbon;
use Intervention\Image\Laravel\Facades\Image as InterventionImage;

class ReservationController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::check()) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $searchQuery = $request->input('searchQuery', '');
        $page = $request->input('page', default: 0);
        $limit = $request->input('limit');

        $filters = [
            'clearedForCheckin' => $request->input('filters.clearedForCheckin'),
            'clearedForCheckout' => $request->input('filters.clearedForCheckout'),
            'createdBy' => $request->input('filters.createdBy'),
            'contact_id' => $request->input('filters.contact_id'),
            'dateFilter' => [
                'field' => $request->input('filters.dateFilter.field'),
                'range' => $request->input('filters.dateFilter.range'),
                'customStart' => $request->input('filters.dateFilter.customStart'),
                'customEnd' => $request->input('filters.dateFilter.customEnd'),
            ]
        ];

        $query = Reservation::with([
            'created_by:id,name,email,role',
            'contact:id,institution',
            'contactPerson:id,first_name,last_name,title,email,phone',
        ]);

        if (!empty($searchQuery)) {
            $trimmedQuery = trim($searchQuery);
            $query->where(function ($q) use ($trimmedQuery) {
                $q->where('reservation_number', 'LIKE', "%{$trimmedQuery}%")
                    ->orWhere('car_plate_number', 'LIKE', "%{$trimmedQuery}%")
                    ->orWhere('id_or_passport_number', 'LIKE', "%{$trimmedQuery}%")
                    ->orWhereHas('contact', function ($contactQuery) use ($trimmedQuery) {
                        $contactQuery->where('institution', 'LIKE', "%{$trimmedQuery}%");
                    })
                    ->orWhereHas('contactPerson', function ($personQuery) use ($trimmedQuery) {
                        $personQuery->where('first_name', 'LIKE', "%{$trimmedQuery}%")
                            ->orWhere('last_name', 'LIKE', "%{$trimmedQuery}%");
                    });
            });
        }

        if (!empty($filters['contact_id'])) {
            $query->where('contact_id', $filters['contact_id']);
        }

        if (!empty($filters['clearedForCheckin'])) {
            $query->where('cleared_for_checkin->status', $filters['clearedForCheckin']);
        }

        if (!empty($filters['clearedForCheckout'])) {
            $query->where('cleared_for_checkout->status', $filters['clearedForCheckout']);
        }

        if (!empty($filters['createdBy'])) {
            $query->where('created_by_id', $filters['createdBy']);
        }

        if (!empty($filters['dateFilter']['field']) && !empty($filters['dateFilter']['range'])) {
            $field = $filters['dateFilter']['field'];
            $range = $filters['dateFilter']['range'];
            $customStart = $filters['dateFilter']['customStart'];
            $customEnd = $filters['dateFilter']['customEnd'];

            $startDate = null;
            $endDate = Carbon::now();

            if ($range === 'custom' && $customStart && $customEnd) {
                $startDate = Carbon::parse($customStart);
                $endDate = Carbon::parse($customEnd);
            } elseif ($range !== 'custom') {
                switch ($range) {
                    case 'last3Months':
                        $startDate = Carbon::now()->subMonths(3);
                        break;
                    case 'last6Months':
                        $startDate = Carbon::now()->subMonths(6);
                        break;
                    case 'lastYear':
                        $startDate = Carbon::now()->subYear();
                        break;
                }
            }

            if ($startDate) {
                $dbField = match ($field) {
                    'created_at' => 'created_at',
                    'check_in_date' => 'check_in_date',
                    'check_out_date' => 'check_out_date',
                    default => $field
                };
                $query->whereBetween($dbField, [$startDate, $endDate]);
            }
        }

        $totalCount = $query->count();
        $query->orderBy('created_at', 'desc');

        if ($limit) {
            $results = $query->skip($page * $limit)->take($limit)->get();
            $totalPages = ceil($totalCount / $limit);
        } else {
            $results = $query->get();
            $totalPages = 1;
        }

        return response()->json([
            'results' => $results,
            'totalCount' => $totalCount,
            'totalPages' => $totalPages,
            'page' => $page,
            'hasMore' => $page < $totalPages - 1,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'contact_id' => 'required|string|exists:contacts,id',
            'contact_person_id' => 'required|string|exists:contact_persons,id',
            'check_in_date' => 'required|date',
            'check_out_date' => 'required|date|after:check_in_date',
            'car_plate_number' => 'nullable|string',
            'reservation_number' => 'required|string|unique:reservations',
            'id_or_passport_number' => 'nullable|string',
            'id_or_passport_photo' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:20480',
            'cleared_for_checkin' => 'nullable|array',
            'cleared_for_checkin.cleared_by' => 'nullable|string',
            'cleared_for_checkin.cleared_date' => 'nullable|date',
            'cleared_for_checkin.status' => 'nullable|in:pending,approved,rejected',
            'cleared_for_checkin.comments' => 'nullable|string',
            'cleared_for_checkout' => 'nullable|array',
            'cleared_for_checkout.cleared_by' => 'nullable|string',
            'cleared_for_checkout.cleared_date' => 'nullable|date',
            'cleared_for_checkout.status' => 'nullable|in:pending,approved,rejected',
            'cleared_for_checkout.comments' => 'nullable|string',
            'created_by_id' => 'required|string|exists:users,id',
        ]);

        if ($request->hasFile('id_or_passport_photo')) {
            $uploadedFile = $request->file('id_or_passport_photo');
            $filename = time() . '_' . $uploadedFile->getClientOriginalName();
            $extension = $uploadedFile->getClientOriginalExtension();

            $imageData = getimagesize($uploadedFile->getPathname());
            $originalWidth = $imageData[0];
            $originalHeight = $imageData[1];

            $img = InterventionImage::read($uploadedFile)->scale(width: 800);
            $path = 'reservations/' . $filename;
            $encodedImage = $this->encodeImage($img, $extension);

            Storage::disk('public')->put($path, $encodedImage);
            $updated_path = config('app.url') . '/storage/' . $path;

            $scaleFactor = 800 / $originalWidth;
            $newHeight = (int) ($originalHeight * $scaleFactor);

            $validated['id_or_passport_photo'] = $updated_path;
        }

        $reservation = Reservation::create(array_merge($validated, ['id' => Uuid::uuid4()->toString()]));

        return response()->json($reservation->load(['created_by', 'contact', 'contactPerson']), 201);
    }

    public function show($id)
    {
        $reservation = Reservation::with(['created_by', 'contact', 'contactPerson'])->findOrFail($id);
        return response()->json($reservation);
    }

    public function update(Request $request, $id)
    {
        $reservation = Reservation::findOrFail($id);

        $validated = $request->validate([
            'contact_id' => 'sometimes|required|string|exists:contacts,id',
            'contact_person_id' => 'sometimes|required|string|exists:contact_persons,id',
            'check_in_date' => 'sometimes|required|date',
            'check_out_date' => 'sometimes|required|date|after:check_in_date',
            'car_plate_number' => 'nullable|string',
            'reservation_number' => 'sometimes|required|string|unique:reservations,reservation_number,' . $id . ',id',
            'id_or_passport_number' => 'sometimes|required|string',
            'id_or_passport_photo' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:20480',
            'cleared_for_checkin' => 'sometimes|nullable|array',
            'cleared_for_checkin.cleared_by' => 'nullable|string',
            'cleared_for_checkin.cleared_date' => 'nullable|date',
            'cleared_for_checkin.status' => 'nullable|in:pending,approved,rejected',
            'cleared_for_checkin.comments' => 'nullable|string',
            'cleared_for_checkout' => 'sometimes|nullable|array',
            'cleared_for_checkout.cleared_by' => 'nullable|string',
            'cleared_for_checkout.cleared_date' => 'nullable|date',
            'cleared_for_checkout.status' => 'nullable|in:pending,approved,rejected',
            'cleared_for_checkout.comments' => 'nullable|string',
        ]);

        if ($request->hasFile('id_or_passport_photo')) {
            if ($reservation->id_or_passport_photo) {
                $relativePath = str_replace(config('app.url') . '/storage/', '', $reservation->id_or_passport_photo);
                $relativePath = ltrim($relativePath, '/');
                Storage::disk('public')->delete($relativePath);
            }

            $uploadedFile = $request->file('id_or_passport_photo');
            $filename = time() . '_' . $uploadedFile->getClientOriginalName();
            $extension = $uploadedFile->getClientOriginalExtension();

            $imageData = getimagesize($uploadedFile->getPathname());
            $originalWidth = $imageData[0];
            $originalHeight = $imageData[1];

            $img = InterventionImage::read($uploadedFile)->scale(width: 800);
            $path = 'reservations/' . $filename;
            $encodedImage = $this->encodeImage($img, $extension);

            Storage::disk('public')->put($path, $encodedImage);
            $updated_path = config('app.url') . '/storage/' . $path;

            $scaleFactor = 800 / $originalWidth;
            $newHeight = (int) ($originalHeight * $scaleFactor);

            $validated['id_or_passport_photo'] = $updated_path;
        }

        $reservation->update($validated);

        return response()->json($reservation->load(['created_by', 'contact', 'contactPerson']));
    }

    public function destroy($id)
    {
        $reservation = Reservation::findOrFail($id);

        if ($reservation->id_or_passport_photo) {
            $relativePath = str_replace(config('app.url') . '/storage/', '', $reservation->id_or_passport_photo);
            $relativePath = ltrim($relativePath, '/');
            Storage::disk('public')->delete($relativePath);
        }

        $reservation->delete();
        return response()->json(null, 204);
    }

    private function encodeImage($img, $extension)
    {
        $extension = strtolower($extension);

        switch ($extension) {
            case 'jpg':
            case 'jpeg':
                return (string) $img->toJpeg(quality: 85);
            case 'png':
                return (string) $img->toPng();
            case 'gif':
                return (string) $img->toGif();
            default:
                return (string) $img->toJpeg(quality: 85);
        }
    }
}