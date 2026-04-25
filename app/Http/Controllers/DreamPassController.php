<?php

namespace App\Http\Controllers;

use App\Models\DreamPass;
use App\Models\DreamPassActivity;
use App\Models\DreamPassSouvenirDiscount;
use App\Models\User;
use App\Services\DreamPassEmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class DreamPassController extends Controller
{

    protected $emailService;

    public function __construct(DreamPassEmailService $emailService)
    {
        $this->emailService = $emailService;
    }
    public function index(Request $request)
    {
        $query = DreamPass::with(['createdBy', 'activities.redemptions', 'souvenirDiscount']);

        if ($request->has('room_number')) {
            $query->where('room_number', $request->room_number);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $dreamPasses = $query->latest()->paginate(200);

        return response()->json($dreamPasses);
    }

    public function store(Request $request)
    {
        $request->validate([
            'day_visit' => 'boolean',
            'room_number' => 'required|string|max:50',
            'guest_name' => 'nullable|string|max:100',
            'check_in_date' => 'nullable|date',
            'check_out_date' => 'nullable|date|after_or_equal:check_in_date',
            'activities' => 'required|array|min:1',
            'activities.*.activity_name' => 'required|string|in:Carriage Ride,Horse Ride,Mini Golf,Archery,Shop',
            'activities.*.valid_from' => 'required|date',
            'activities.*.voucher_count' => 'required|integer|min:1',
            'activities.*.valid_to' => 'required|date|after_or_equal:activities.*.valid_from',
            'souvenir_discount' => 'nullable|array',
            'souvenir_discount.discount_percentage' => 'required_with:souvenir_discount|numeric|min:0|max:100',
            'souvenir_discount.valid_from' => 'required_with:souvenir_discount|date',
            'souvenir_discount.valid_to' => 'required_with:souvenir_discount|date|after_or_equal:souvenir_discount.valid_from',
            'souvenir_discount.applicable_items' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($request) {
            $dreamPass = DreamPass::create([
                'room_number' => $request->room_number,
                'guest_name' => $request->guest_name,
                'created_by_id' => Auth::id(),
                'check_in_date' => $request->check_in_date,
                'check_out_date' => $request->check_out_date,
                'day_visit' => $request->day_visit,
                'status' => 'pending',
            ]);

            foreach ($request->activities as $act) {
                DreamPassActivity::create([
                    'dream_pass_id' => $dreamPass->id,
                    'activity_name' => $act['activity_name'],
                    'voucher_count' => $act['voucher_count'],
                    'valid_from' => $act['valid_from'],
                    'valid_to' => $act['valid_to'],
                ]);
            }

            if ($request->filled('souvenir_discount')) {
                DreamPassSouvenirDiscount::create([
                    'dream_pass_id' => $dreamPass->id,
                    'discount_percentage' => $request->souvenir_discount['discount_percentage'],
                    'valid_from' => $request->souvenir_discount['valid_from'],
                    'valid_to' => $request->souvenir_discount['valid_to'],
                    'applicable_items' => $request->souvenir_discount['applicable_items'] ?? null,
                ]);
            }

            $dreamPass->load(['activities', 'souvenirDiscount']);

            return response()->json($dreamPass, 201);
        });
    }

    public function show($id)
    {
        $dreamPass = DreamPass::with(['createdBy', 'activities.redemptions', 'souvenirDiscount'])->findOrFail($id);

        return response()->json($dreamPass);
    }

    public function update(Request $request, $id)
    {
        $dreamPass = DreamPass::findOrFail($id);

        $request->validate([
            'guest_name' => 'sometimes|string|max:100',
            'check_in_date' => 'nullable|date',
            'check_out_date' => 'nullable|date|after_or_equal:check_in_date',
            'activities' => 'required|array|min:1',
            'activities.*.id' => 'nullable|exists:dream_pass_activities,id,dream_pass_id,' . $dreamPass->id,
            'activities.*.activity_name' => 'required|string|in:Carriage Ride,Horse Ride,Mini Golf,Archery,Shop',
            'activities.*.valid_from' => 'required|date',
            'activities.*.voucher_count' => 'required|integer|min:1',
            'activities.*.valid_to' => 'required|date|after_or_equal:activities.*.valid_from',
            'souvenir_discount' => 'nullable|array',
            'souvenir_discount.discount_percentage' => 'required_with:souvenir_discount|numeric|min:0|max:100',
            'souvenir_discount.valid_from' => 'required_with:souvenir_discount|date',
            'souvenir_discount.valid_to' => 'required_with:souvenir_discount|date|after_or_equal:souvenir_discount.valid_from',
            'souvenir_discount.applicable_items' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($request, $dreamPass) {

            $dreamPass->update([
                'guest_name' => $request->guest_name ?? $dreamPass->guest_name,
                'check_in_date' => $request->check_in_date,
                'check_out_date' => $request->check_out_date,
            ]);

            $existingActivityIds = $dreamPass->activities->pluck('id')->toArray();
            $incomingActivityIds = collect($request->activities)->pluck('id')->filter()->values()->toArray();
            $toDelete = array_diff($existingActivityIds, $incomingActivityIds);

            if (!empty($toDelete)) {
                $safeToDeleteIds = DreamPassActivity::whereIn('id', $toDelete)
                    ->withCount('redemptions')
                    ->get()
                    ->where('redemptions_count', 0)
                    ->pluck('id')
                    ->toArray();

                if (!empty($safeToDeleteIds)) {
                    DreamPassActivity::whereIn('id', $safeToDeleteIds)->delete();
                }
            }

            foreach ($request->activities as $act) {
                if (!empty($act['id'])) {
                    $existing = DreamPassActivity::where('id', $act['id'])
                        ->where('dream_pass_id', $dreamPass->id)
                        ->withCount('redemptions')
                        ->first();

                    if (!$existing) {
                        continue;
                    }

                    if ($act['voucher_count'] < $existing->redemptions_count) {
                        return response()->json([
                            'message' => "Cannot set voucher count for \"{$existing->activity_name}\" to {$act['voucher_count']}. "
                                . "{$existing->redemptions_count} voucher(s) have already been redeemed.",
                        ], 422);
                    }

                    $existing->update([
                        'activity_name' => $act['activity_name'],
                        'voucher_count' => $act['voucher_count'],
                        'valid_from' => $act['valid_from'],
                        'valid_to' => $act['valid_to'],
                    ]);
                } else {
                    $existingByName = DreamPassActivity::where('dream_pass_id', $dreamPass->id)
                        ->where('activity_name', $act['activity_name'])
                        ->withCount('redemptions')
                        ->first();

                    if ($existingByName) {
                        if ($act['voucher_count'] < $existingByName->redemptions_count) {
                            return response()->json([
                                'message' => "Cannot set voucher count for \"{$existingByName->activity_name}\" to {$act['voucher_count']}. "
                                    . "{$existingByName->redemptions_count} voucher(s) have already been redeemed.",
                            ], 422);
                        }

                        $existingByName->update([
                            'voucher_count' => $act['voucher_count'],
                            'valid_from' => $act['valid_from'],
                            'valid_to' => $act['valid_to'],
                        ]);
                    } else {
                        DreamPassActivity::create([
                            'dream_pass_id' => $dreamPass->id,
                            'activity_name' => $act['activity_name'],
                            'voucher_count' => $act['voucher_count'],
                            'valid_from' => $act['valid_from'],
                            'valid_to' => $act['valid_to'],
                        ]);
                    }
                }
            }

            if ($request->filled('souvenir_discount')) {
                $dreamPass->souvenirDiscount()->updateOrCreate(
                    ['dream_pass_id' => $dreamPass->id],
                    [
                        'discount_percentage' => $request->souvenir_discount['discount_percentage'],
                        'valid_from' => $request->souvenir_discount['valid_from'],
                        'valid_to' => $request->souvenir_discount['valid_to'],
                        'applicable_items' => $request->souvenir_discount['applicable_items'] ?? null,
                    ]
                );
            } elseif ($dreamPass->souvenirDiscount) {
                $dreamPass->souvenirDiscount->delete();
            }

            $dreamPass->load(['activities.redemptions', 'souvenirDiscount']);

            return response()->json($dreamPass);
        });
    }

    public function destroy($id)
    {
        $dreamPass = DreamPass::findOrFail($id);
        return DB::transaction(function () use ($dreamPass) {
            foreach ($dreamPass->activities as $activity) {
                $activity->redemptions()->delete();
            }

            $dreamPass->activities()->delete();

            if ($dreamPass->souvenirDiscount) {
                $dreamPass->souvenirDiscount->delete();
            }

            $dreamPass->delete();

            return response()->json(null, 204);
        });
    }

    public function approve($id)
    {
        $dreamPass = DreamPass::findOrFail($id);

        $dreamPass->update([
            'status' => 'approved',
            'approved_by_admin_id' => Auth::id(),
            'approved_at' => now(),
        ]);

        return response()->json($dreamPass);
    }

    public function reject($id)
    {
        $dreamPass = DreamPass::findOrFail($id);

        $dreamPass->update([
            'status' => 'rejected',
        ]);

        return response()->json($dreamPass);
    }
    public function draft($id)
    {
        $dreamPass = DreamPass::findOrFail($id);

        $dreamPass->update([
            'status' => 'draft',
        ]);

        return response()->json($dreamPass);
    }
    public function pending($id)
    {
        $dreamPass = DreamPass::findOrFail($id);

        $dreamPass->update([
            'status' => 'pending',
        ]);

        return response()->json($dreamPass);
    }
    public function sendCreateDreamPassNotification(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'refNo' => 'required|string',
                'roomNumber' => 'required|string',
                'activityCount' => 'required|string',
                'checkInDate' => 'nullable|string',
            ]);

            $adminUsers = User::where('role', 'admin')
                ->where('deleted', false)
                ->get();

            if ($adminUsers->isEmpty()) {
                return response()->json(['message' => 'No admin users found'], 404);
            }

            $emailResults = [];
            foreach ($adminUsers as $user) {
                try {
                    $this->emailService->createDreamPass(
                        $user,
                        $user->name,
                        $data['refNo'],
                        $data['roomNumber'],
                        $data['activityCount'],
                        $data['checkInDate'] ?? null
                    );

                    $emailResults[] = [
                        'userId' => $user->id,
                        'email' => $user->email,
                        'status' => 'success',
                    ];
                } catch (\Exception $err) {
                    $emailResults[] = [
                        'userId' => $user->id,
                        'email' => $user->email,
                        'status' => 'failed',
                        'error' => $err->getMessage(),
                    ];
                }
            }

            $successfulEmails = count(array_filter($emailResults, fn($result) => $result['status'] === 'success'));

            return response()->json([
                'message' => "DreamPass notification emails sent to {$successfulEmails} admin users",
                'totalAdmins' => $adminUsers->count(),
                'successful' => $successfulEmails,
                'failed' => $adminUsers->count() - $successfulEmails,
                'details' => $emailResults,
            ], 200);
        } catch (\Exception $err) {
            \Log::error('Error in create DreamPass notification sending: ' . $err->getMessage());
            return response()->json([
                'message' => 'Something went wrong',
                'error' => $err->getMessage(),
            ], 500);
        }
    }
}