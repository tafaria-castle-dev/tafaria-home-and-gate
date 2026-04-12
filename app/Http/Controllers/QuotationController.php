<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Models\User;
use App\Services\EmailService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Mail\Email;
use Illuminate\Support\Facades\Mail;
use Illuminate\Http\JsonResponse;

class QuotationController extends Controller
{
    protected $emailService;

    public function __construct(EmailService $emailService)
    {
        $this->emailService = $emailService;
    }

    public function sendGenerateInvoiceNotification(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'refNo' => 'required|string',
                'userId' => 'required|string',
                'institutionName' => 'nullable|string',
                'name' => 'required|string',
                'totalCost' => 'required|numeric',
            ]);

            $user = User::find($data['userId']);

            if (!$user) {
                return response()->json(['message' => 'No users found'], 404);
            }

            $this->emailService->generateInvoice(
                $user,
                $data['refNo'],
                $data['name'],
                $data['totalCost'],
                $data['institutionName']
            );

            return response()->json([
                'message' => 'Email sent to quotation creator',
            ], 200);
        } catch (\Exception $err) {
            \Log::error('Error in generate invoice notification sending: ' . $err->getMessage());
            return response()->json([
                'message' => 'Something went wrong',
                'error' => $err->getMessage(),
            ], 500);
        }
    }

    public function sendCreateDraftNotification(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'refNo' => 'required|string',
                'institutionName' => 'nullable|string',
                'name' => 'required|string',
                'totalCost' => 'required|numeric',
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
                    $this->emailService->createDraftNotification(
                        $user,
                        $data['refNo'],
                        $data['name'],
                        $data['totalCost'],
                        $data['institutionName']
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
                'message' => "Draft notification emails sent to {$successfulEmails} admin users",
                'totalAdmins' => $adminUsers->count(),
                'successful' => $successfulEmails,
                'failed' => $adminUsers->count() - $successfulEmails,
                'details' => $emailResults,
            ], 200);
        } catch (\Exception $err) {
            \Log::error('Error in draft notification sending: ' . $err->getMessage());
            return response()->json([
                'message' => 'Something went wrong',
                'error' => $err->getMessage(),
            ], 500);
        }
    }

    public function sendCreateQuotationNotification(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'refNo' => 'required|string',
                'institutionName' => 'nullable|string',
                'name' => 'required|string',
                'totalCost' => 'required|numeric',
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
                    $this->emailService->createQuotation(
                        $user,
                        $data['refNo'],
                        $data['name'],
                        $data['totalCost'],
                        $data['institutionName']
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
                'message' => "Quotation notification emails sent to {$successfulEmails} admin users",
                'totalAdmins' => $adminUsers->count(),
                'successful' => $successfulEmails,
                'failed' => $adminUsers->count() - $successfulEmails,
                'details' => $emailResults,
            ], 200);
        } catch (\Exception $err) {
            \Log::error('Error in create quotation notification sending: ' . $err->getMessage());
            return response()->json([
                'message' => 'Something went wrong',
                'error' => $err->getMessage(),
            ], 500);
        }
    }

    public function approveQuotation(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'refNo' => 'required|string',
                'userId' => 'required|string',
                'institutionName' => 'nullable|string',
                'name' => 'required|string',
                'totalCost' => 'nullable|numeric',
            ]);

            $user = User::find($data['userId']);

            if (!$user) {
                return response()->json(['message' => 'No users found'], 404);
            }

            $this->emailService->approveQuotation(
                $user,
                $data['refNo'],
                $data['name'],
                $data['totalCost'],
                $data['institutionName']
            );

            return response()->json(['message' => 'Email sent to quotation creator'], 200);
        } catch (\Exception $err) {
            return response()->json([
                'message' => 'Something went wrong',
                'error' => $err->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
    {
        $searchQuery = $request->input('search', '');
        $userId = $request->input('user_id', '');

        $filters = [
            'status' => $request->input('status'),
            'created_by' => $request->input('created_by'),
            'prepared_by' => $request->input('prepared_by'),
            'dateField' => $request->input('dateField'),
            'dateRange' => $request->input('dateRange'),
            'customStart' => $request->input('customStart'),
            'customEnd' => $request->input('customEnd'),
        ];

        $query = Quotation::query()
            ->leftJoin('guest_reservations', function ($join) {
                $join->whereRaw(
                    "guest_reservations.ref_no = JSON_UNQUOTE(JSON_EXTRACT(quotations.quotation_details, '$.refNo'))"
                );
            })
            ->select('quotations.*', 'guest_reservations.id as reservation_id');

        if (!empty($searchQuery)) {
            $trimmedQuery = trim($searchQuery);
            $query->where(function ($q) use ($trimmedQuery) {
                $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(quotations.quotation_details, '$.name')) LIKE ?", ["%{$trimmedQuery}%"])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(quotations.quotation_details, '$.institutionName')) LIKE ?", ["%{$trimmedQuery}%"])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(quotations.quotation_details, '$.refNo')) LIKE ?", ["%{$trimmedQuery}%"])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(quotations.quotation_details, '$.phone')) LIKE ?", ["%{$trimmedQuery}%"])
                    ->orWhereHas('contact', function ($q) use ($trimmedQuery) {
                        $q->where('institution', 'like', "%{$trimmedQuery}%");
                    })
                    ->orWhereHas('contactPerson', function ($q) use ($trimmedQuery) {
                        $q->where('first_name', 'like', "%{$trimmedQuery}%")
                            ->orWhere('last_name', 'like', "%{$trimmedQuery}%")
                            ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$trimmedQuery}%"]);
                    });
            });
        }

        if (!empty($filters['status'])) {
            $query->where('quotations.status', $filters['status']);
        }

        if (!empty($userId)) {
            $query->where('quotations.user_id', $userId);
        }

        if (!empty($filters['created_by'])) {
            $query->where('quotations.user_id', $filters['created_by']);
        }

        if (!empty($filters['prepared_by'])) {
            $preparedBy = $filters['prepared_by'];
            $query->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(quotations.quotation_details, '$.preparedBy')) LIKE ?", ["%{$preparedBy}%"]);
        }

        if (!empty($filters['dateField']) && !empty($filters['dateRange'])) {
            $field = $filters['dateField'];
            $range = $filters['dateRange'];
            $customStart = $filters['customStart'];
            $customEnd = $filters['customEnd'];

            $startDate = null;
            $endDate = Carbon::now();

            if ($range === 'custom' && $customStart && $customEnd) {
                $startDate = Carbon::parse($customStart)->startOfDay();
                $endDate = Carbon::parse($customEnd)->endOfDay();
            } elseif ($range !== 'custom') {
                switch ($range) {
                    case 'last3Months':
                        $startDate = Carbon::now()->subMonths(3)->startOfDay();
                        break;
                    case 'last6Months':
                        $startDate = Carbon::now()->subMonths(6)->startOfDay();
                        break;
                    case 'lastYear':
                        $startDate = Carbon::now()->subYear()->startOfDay();
                        break;
                }
                $endDate = Carbon::now()->endOfDay();
            }

            if ($startDate) {
                $dbField = match ($field) {
                    'created_at' => 'quotations.created_at',
                    'updated_at' => 'quotations.updated_at',
                    'approved_on' => 'quotations.approved_on',
                    default => 'quotations.created_at'
                };
                $query->whereBetween($dbField, [$startDate, $endDate]);
            }
        }

        $results = $query->with([
            'user:id,signature',
            'contact:id,institution',
            'contactPerson:id,first_name,last_name,phone,email'
        ])->orderBy('quotations.created_at', 'desc')->get();

        return response()->json($results);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Quotation::class);
        $validated = $request->validate([
            'user_id' => 'required|string|exists:users,id',
            'contact_id' => 'nullable|string|exists:contacts,id',
            'contact_person_id' => 'nullable|string|exists:contact_persons,id',
            'is_invoice_generated' => 'boolean',
            'no_accommodation' => 'boolean',
            'status' => 'string|in:pending,approved,rejected,draft',
            'approved_on' => 'date|nullable',
            'quotation_details' => 'array'
        ]);

        $quotation = Quotation::create(array_merge($validated, ['id' => Str::uuid()]));
        return response()->json($quotation, 201);
    }

    public function show($id)
    {
        $quotation = Quotation::findOrFail($id);
        $this->authorize('view', $quotation);
        $quotation->load([
            'user:id,signature',
            'contact:id,institution',
            'contactPerson:id,first_name,last_name'
        ]);
        return response()->json($quotation);
    }

    public function update(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);
        $this->authorize('update', $quotation);
        $validated = $request->validate([
            'user_id' => 'string|exists:users,id',
            'contact_id' => 'nullable|string|exists:contacts,id',
            'contact_person_id' => 'nullable|string|exists:contact_persons,id',
            'is_invoice_generated' => 'boolean',
            'no_accommodation' => 'boolean',
            'status' => 'string|in:pending,approved,rejected,draft',
            'approved_on' => 'date|nullable',
            'quotation_details' => 'array'
        ]);

        $quotation->update(array_filter($validated));
        return response()->json($quotation);
    }

    public function destroy($id)
    {
        $quotation = Quotation::findOrFail($id);
        $this->authorize('delete', $quotation);
        $quotation->delete();
        return response()->json(null, 204);
    }
}