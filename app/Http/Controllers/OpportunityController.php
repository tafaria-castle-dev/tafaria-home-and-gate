<?php

namespace App\Http\Controllers;

use App\Models\Opportunity;
use App\Models\OpportunityFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Ramsey\Uuid\Uuid;
use App\Models\User;


use Carbon\Carbon;
class OpportunityController extends Controller
{
    public function index(Request $request)
    {
        if (!Auth::check()) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $searchQuery = $request->input('searchQuery', '');
        $page = $request->input('page', default: 0);
        $contact_id = $request->input('contact_id');
        $limit = $request->input('limit');

        $filters = [
            'stage' => $request->input('filters.stage'),
            'assistantClerk' => $request->input('filters.assistantClerk'),
            'createdBy' => $request->input('filters.createdBy'),
            'preparedBy' => $request->input('filters.preparedBy'),
            'preparedByClerk' => $request->input('filters.preparedByClerk'),
            'type' => $request->input('filters.type'),
            'dateFilter' => [
                'field' => $request->input('filters.dateFilter.field'),
                'range' => $request->input('filters.dateFilter.range'),
                'customStart' => $request->input('filters.dateFilter.customStart'),
                'customEnd' => $request->input('filters.dateFilter.customEnd'),
            ]
        ];

        $query = Opportunity::with([
            'assistantClerk:id,name,email,role',
            'createdBy:id,name,email,role',
            'contact:id,institution',
            'files',
            'contact.contactPersons:id,first_name,last_name,title,email,phone,contact_id',
            'contactPerson:id,first_name,last_name,title,email,phone',
            'lastUpdate:id,updated_at,super_staff,updated_by_id',
            'lastUpdate.updatedBy:id,name,email,role'
        ]);

        if (!empty($searchQuery)) {
            $trimmedQuery = trim($searchQuery);
            $query->where(function ($q) use ($trimmedQuery) {
                $q->where('name', 'LIKE', "%{$trimmedQuery}%")
                    ->orWhereHas('contact', function ($contactQuery) use ($trimmedQuery) {
                        $contactQuery->where('institution', 'LIKE', "%{$trimmedQuery}%");
                    })
                    ->orWhereHas('contact.contactPersons', function ($personQuery) use ($trimmedQuery) {
                        $personQuery->where('first_name', 'LIKE', "%{$trimmedQuery}%")
                            ->orWhere('last_name', 'LIKE', "%{$trimmedQuery}%");
                    });
            });
        }

        if (!empty($filters['stage'])) {
            $query->where('stage', $filters['stage']);
        }
        if (!empty($filters['type'])) {
            $query->where('name', $filters['type']);
        }

        if (!empty($contact_id)) {
            $query->where('contact_id', $contact_id);
        }

        if (!empty($filters['assistantClerk'])) {
            $user = User::where('id', $filters['assistantClerk'])->first();
            if ($user->role == "super_staff" || $user->id == "cmcakep27000cxy0rd6mmi0na") {
                if ($filters['assistantClerk'] === 'cmcakep27000cxy0rd6mmi0na') {
                    $query->where(function ($q) use ($filters, ) {
                        $q->where('assistant_clerk_id', $filters['assistantClerk'])
                            ->orWhere(function ($subQ) {
                                $subQ->whereHas('assistantClerk', function ($clerkQ) {
                                    $clerkQ->where('role', 'super_staff');
                                })
                                    ->where('prepared_by', 'LIKE', '%Francis%');
                            });
                    });
                } else {
                    $query->where(function ($q) {
                        $q->where(function ($subQ) {
                            $subQ->whereHas('assistantClerk', function ($clerkQ) {
                                $clerkQ->where('role', 'super_staff');
                            })
                                ->where(function ($emptyQ) {
                                    $emptyQ->whereNull('prepared_by')
                                        ->orWhere('prepared_by', '');
                                });
                        })
                            ->orWhere('prepared_by', 'LIKE', '%Laura%');
                    });
                }
            } else {
                $query->where('assistant_clerk_id', $filters['assistantClerk']);
            }
        }

        if (!empty($filters['createdBy'])) {
            $user = User::where('id', $filters['createdBy'])->first();
            if ($user->role == "super_staff" || $user->id == "cmcakep27000cxy0rd6mmi0na") {
                if ($filters['createdBy'] === 'cmcakep27000cxy0rd6mmi0na') {
                    $query->where(function ($q) use ($filters, ) {
                        $q->where('created_by_id', $filters['createdBy'])
                            ->orWhere(function ($subQ) {
                                $subQ->whereHas('createdBy', function ($clerkQ) {
                                    $clerkQ->where('role', 'super_staff');
                                })
                                    ->where('prepared_by', 'LIKE', '%Francis%');
                            });
                    });
                } else {
                    $query->where(function ($q) {
                        $q->where(function ($subQ) {
                            $subQ->whereHas('createdBy', function ($clerkQ) {
                                $clerkQ->where('role', 'super_staff');
                            })
                                ->where(function ($emptyQ) {
                                    $emptyQ->whereNull('prepared_by')
                                        ->orWhere('prepared_by', '');
                                });
                        })
                            ->orWhere('prepared_by', 'LIKE', '%Laura%');
                    });
                }
            } else {
                $query->where('created_by_id', $filters['createdBy']);
            }
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
                if ($field === 'lastActivity') {
                    $query->whereHas('lastUpdate', function ($updateQuery) use ($startDate, $endDate) {
                        $updateQuery->whereBetween('updated_at', [$startDate, $endDate]);
                    });
                } else {
                    $dbField = match ($field) {
                        'created_at' => 'created_at',
                        'close_date' => 'close_date',
                        default => $field
                    };
                    $query->whereBetween($dbField, [$startDate, $endDate]);
                }
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
            'name' => 'required|string',
            'stage' => 'required|string',
            'description' => 'nullable|string',
            'year' => 'nullable|string',
            'probability' => 'required|integer',
            'close_date' => 'required|date',
            'amount' => 'nullable|numeric',
            'prepared_by' => 'nullable|string',
            'created_by_id' => 'required|string|exists:users,id',
            'assistant_clerk_id' => 'nullable|string|exists:users,id',
            'contact_id' => 'required|string|exists:contacts,id',
            'contact_person_id' => 'required|string|exists:contact_persons,id',
            'last_update_id' => 'nullable|string|exists:last_updates,id',
        ]);

        $opportunity = Opportunity::create(array_merge($validated, ['id' => Uuid::uuid4()->toString()]));

        return response()->json($opportunity->load(['createdBy', 'assistantClerk', 'contact', 'contactPerson', 'lastUpdate', 'emailActivities', 'callLogs', 'files']), 201);
    }

    public function show($id)
    {
        $opportunity = Opportunity::with(['createdBy', 'assistantClerk', 'contact', 'contactPerson', 'last_update', 'emailActivities', 'callLogs', 'files'])->findOrFail($id);
        return response()->json($opportunity);
    }

    public function update(Request $request, $id)
    {
        $opportunity = Opportunity::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string',
            'stage' => 'sometimes|string',
            'files' => 'sometimes|array',
            'description' => 'nullable|string',
            'year' => 'nullable|string',
            'probability' => 'sometimes|integer',
            'close_date' => 'sometimes|date',
            'amount' => 'nullable|numeric',
            'prepared_by' => 'nullable|string',
            'created_by_id' => 'sometimes|string|exists:users,id',
            'assistant_clerk_id' => 'nullable|string|exists:users,id',
            'contact_id' => 'sometimes|string|exists:contacts,id',
            'contact_person_id' => 'sometimes|string|exists:contact_persons,id',
            'last_update_id' => 'nullable|string|exists:last_updates,id',
        ]);

        $opportunity->update($validated);

        return response()->json($opportunity->load(['createdBy', 'assistantClerk', 'contact', 'contactPerson', 'lastUpdate', 'emailActivities', 'callLogs', 'files']));
    }

    public function destroy($id)
    {
        $opportunity = Opportunity::findOrFail($id);
        $opportunity->delete();
        return response()->json(null, 204);
    }

    public function storeFile(Request $request, $opportunityId)
    {
        $validated = $request->validate([
            'file_path' => 'required|string',
        ]);

        $file = OpportunityFile::create([
            'id' => Uuid::uuid4()->toString(),
            'file_path' => $validated['file_path'],
            'opportunity_id' => $opportunityId,
        ]);

        return response()->json($file, 201);
    }
}