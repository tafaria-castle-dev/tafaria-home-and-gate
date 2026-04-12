<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\GuestReservationResource;
use App\Models\GuestReservation;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Log;

class GuestReservationController extends Controller
{
    protected array $relations = [
        'contact',
        'contactPerson',
        'checkedInByUser',
        'createdByUser',
        'checkedInByGuard',
        'clearedBillsByUser',
        'clearedByHouseKeepingUser',
    ];

    public function index(Request $request)
    {
        $query = GuestReservation::with($this->relations)->latest();
        $query = $this->applyFilters($query, $request);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('guest_name', 'like', "%{$search}%")
                    ->orWhere('reservation_number', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%")
                    ->orWhere('car_plate_number', 'like', "%{$search}%")
                    ->orWhereHas('contact', fn($r) => $r->where('institution', 'like', "%{$search}%"))
                    ->orWhereHas('contactPerson', fn($r) => $r->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%"));
            });
        }

        $perPage = min((int) $request->get('per_page', 25), 100);

        return GuestReservationResource::collection($query->paginate($perPage));
    }

    public function aggregations(Request $request)
    {
        $now = Carbon::now();

        $liveQuery = GuestReservation::whereNotNull('entry_time')->whereNull('exit_time');
        $active = (clone $liveQuery)->count();
        $adultsActive = (int) (clone $liveQuery)->sum('adults_count');
        $kidsActive = (int) (clone $liveQuery)->sum('kids_count');
        $infantsActive = (int) (clone $liveQuery)->sum('infants_count');
        $overdue = (clone $liveQuery)->whereNotNull('check_out')->where('check_out', '<', $now)->count();

        $entryBase = GuestReservation::query();
        $this->applyDateRangeFilter($entryBase, $request, 'entry_time');

        $exitBase = GuestReservation::query();
        $this->applyDateRangeFilter($exitBase, $request, 'exit_time');

        $checkInsInPeriod = (clone $entryBase)->count();
        $checkOutsInPeriod = (clone $exitBase)->count();
        $corporate = (clone $entryBase)->where('type', 'corporate')->count();
        $leisure = (clone $entryBase)->where('type', 'leisure')->count();
        $walkIn = (clone $entryBase)->where('entry_type', 'walk_in')->count();
        $driveIn = (clone $entryBase)->where('entry_type', 'drive_in')->count();
        $express = (clone $entryBase)->where('is_express_check_in', true)->count();
        $vip = (clone $entryBase)->where(function ($q) {
            $q->whereNotNull('dream_pass_code')->orWhere('is_express_check_in', true);
        })->count();

        $billsPending = (clone $entryBase)->where(function ($q) {
            $q->whereNull('cleared_bills')
                ->orWhere('cleared_bills->is_cleared', false)
                ->orWhereJsonDoesntContainKey('cleared_bills->is_cleared');
        })->count();

        $billsCleared = (clone $entryBase)->where('cleared_bills->is_cleared', true)->count();

        $housekeepingPending = (clone $entryBase)->where(function ($q) {
            $q->whereNull('cleared_by_house_keeping')
                ->orWhere('cleared_by_house_keeping->is_cleared', false)
                ->orWhereJsonDoesntContainKey('cleared_by_house_keeping->is_cleared');
        })->count();

        $avgStay = (clone $entryBase)
            ->whereNotNull('exit_time')
            ->select(DB::raw('AVG(TIMESTAMPDIFF(MINUTE, entry_time, exit_time)) as avg_minutes'))
            ->value('avg_minutes');

        $sectionBreakdown = (clone $entryBase)
            ->select('section', DB::raw('COUNT(*) as count'))
            ->groupBy('section')
            ->orderByDesc('count')
            ->get()
            ->map(fn($r) => ['section' => $r->section, 'count' => $r->count]);

        $typeBySection = (clone $entryBase)
            ->select('section', 'type', DB::raw('COUNT(*) as count'))
            ->groupBy('section', 'type')
            ->get();

        $dailyArrivals = (clone $entryBase)
            ->select(DB::raw('DATE(entry_time) as date'), DB::raw('COUNT(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $dailyDepartures = (clone $exitBase)
            ->select(DB::raw('DATE(exit_time) as date'), DB::raw('COUNT(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'active' => $active,
            'adults_active' => $adultsActive,
            'kids_active' => $kidsActive,
            'infants_active' => $infantsActive,
            'overdue' => $overdue,
            'check_ins_in_period' => $checkInsInPeriod,
            'check_outs_in_period' => $checkOutsInPeriod,
            'corporate' => $corporate,
            'leisure' => $leisure,
            'avg_stay_hours' => $avgStay ? round($avgStay / 60, 2) : 0,
            'avg_stay_minutes' => $avgStay ? (int) round($avgStay) : 0,
            'bills_pending' => $billsPending,
            'bills_cleared' => $billsCleared,
            'housekeeping_pending' => $housekeepingPending,
            'walk_in' => $walkIn,
            'drive_in' => $driveIn,
            'express' => $express,
            'vip' => $vip,
            'section_breakdown' => $sectionBreakdown,
            'type_by_section' => $typeBySection,
            'daily_arrivals' => $dailyArrivals,
            'daily_departures' => $dailyDepartures,
        ]);
    }

    public function show(GuestReservation $guestReservation)
    {
        $guestReservation->load($this->relations);

        $visitCount = GuestReservation::where(function ($q) use ($guestReservation) {
            if ($guestReservation->contact_id) {
                $q->where('contact_id', $guestReservation->contact_id);
            } elseif ($guestReservation->contact_person_id) {
                $q->where('contact_person_id', $guestReservation->contact_person_id);
            } else {
                $q->where('phone_number', $guestReservation->phone_number)
                    ->where('guest_name', $guestReservation->guest_name);
            }
        })->count();

        $totalMinutes = GuestReservation::where(function ($q) use ($guestReservation) {
            if ($guestReservation->contact_id) {
                $q->where('contact_id', $guestReservation->contact_id);
            } elseif ($guestReservation->contact_person_id) {
                $q->where('contact_person_id', $guestReservation->contact_person_id);
            } else {
                $q->where('phone_number', $guestReservation->phone_number);
            }
        })
            ->whereNotNull('entry_time')
            ->whereNotNull('exit_time')
            ->select(DB::raw('SUM(TIMESTAMPDIFF(MINUTE, entry_time, exit_time)) as total_minutes'))
            ->value('total_minutes');

        $resource = new GuestReservationResource($guestReservation);
        $data = $resource->toArray(request());
        $data['visit_count'] = $visitCount;
        $data['total_hours_spent'] = $totalMinutes ? round($totalMinutes / 60, 2) : 0;

        return response()->json($data);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'guest_name' => 'required|string|max:255',
            'visitor_type' => 'nullable|string|max:255',
            'section' => 'required|string|max:255',
            'car_plate_number' => 'nullable|string|max:255',
            'reservation_number' => 'nullable|string|max:255',
            'ref_no' => 'nullable|string|max:255',
            'entry_time' => 'nullable|date',
            'exit_time' => 'nullable|date',
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date',
            'contact_id' => 'nullable|exists:contacts,id',
            'contact_person_id' => 'nullable|exists:contact_persons,id',
            'phone_number' => 'nullable|string|max:255',
            'kids_count' => 'required|integer|min:0',
            'infants_count' => 'required|integer|min:0',
            'adults_count' => 'required|integer|min:1',
            'dream_pass_code' => 'nullable|string|max:255',
            'is_express_check_in' => 'boolean',
            'is_express_check_out' => 'boolean',
            'type' => 'required|in:corporate,leisure',
            'entry_type' => 'required|in:walk_in,drive_in',
            'checked_in_by_user_id' => 'nullable|exists:users,id',
            'created_by_user_id' => 'required|exists:users,id',
            'checked_in_by_guard_id' => 'nullable|exists:users,id',
            'cleared_bills' => 'nullable|array',
            'cleared_bills.is_cleared' => 'nullable|boolean',
            'cleared_bills.comments' => 'nullable|string',
            'cleared_bills_by_user_id' => 'nullable|exists:users,id',
            'cleared_by_house_keeping' => 'nullable|array',
            'cleared_by_house_keeping.is_cleared' => 'nullable|boolean',
            'cleared_by_house_keeping.comments' => 'nullable|string',
            'cleared_by_house_keeping_user_id' => 'nullable|exists:users,id',
        ]);

        $guestReservation = GuestReservation::create($data);
        $guestReservation->load($this->relations);

        return new GuestReservationResource($guestReservation);
    }

    public function update(Request $request, GuestReservation $guestReservation)
    {
        $data = $request->validate([
            'guest_name' => 'sometimes|string|max:255',
            'visitor_type' => 'sometimes|string|max:255',
            'section' => 'sometimes|string|max:255',
            'car_plate_number' => 'nullable|string|max:255',
            'reservation_number' => 'sometimes|string|max:255',
            'ref_no' => 'nullable|string|max:255',
            'entry_time' => 'nullable|date',
            'exit_time' => 'nullable|date',
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date',
            'contact_id' => 'nullable|exists:contacts,id',
            'contact_person_id' => 'nullable|exists:contact_persons,id',
            'phone_number' => 'nullable|string|max:255',
            'kids_count' => 'sometimes|integer|min:0',
            'infants_count' => 'sometimes|integer|min:0',
            'adults_count' => 'sometimes|integer|min:1',
            'dream_pass_code' => 'nullable|string|max:255',
            'is_express_check_in' => 'boolean',
            'is_express_check_out' => 'boolean',
            'type' => 'sometimes|in:corporate,leisure',
            'entry_type' => 'sometimes|in:walk_in,drive_in',
            'checked_in_by_user_id' => 'nullable|exists:users,id',
            'created_by_user_id' => 'nullable|exists:users,id',
            'checked_in_by_guard_id' => 'nullable|exists:users,id',
            'cleared_bills' => 'nullable|array',
            'cleared_bills.is_cleared' => 'nullable|boolean',
            'cleared_bills.comments' => 'nullable|string',
            'cleared_bills_by_user_id' => 'nullable|exists:users,id',
            'cleared_by_house_keeping' => 'nullable|array',
            'cleared_by_house_keeping.is_cleared' => 'nullable|boolean',
            'cleared_by_house_keeping.comments' => 'nullable|string',
            'cleared_by_house_keeping_user_id' => 'nullable|exists:users,id',
        ]);

        $guestReservation->update($data);
        $guestReservation->load($this->relations);

        return new GuestReservationResource($guestReservation);
    }

    public function checkOut(Request $request, GuestReservation $guestReservation)
    {
        if ($guestReservation->exit_time) {
            return response()->json(['message' => 'Guest has already been checked out.'], 422);
        }

        Log::info('Checking out guest reservation:', ['id' => $guestReservation->id]);

        $guestReservation->update(['exit_time' => now()]);
        $guestReservation->load($this->relations);

        return new GuestReservationResource($guestReservation);
    }

    public function checkIn(Request $request, GuestReservation $guestReservation)
    {
        if ($guestReservation->entry_time) {
            return response()->json(['message' => 'Guest has already been checked in.'], 422);
        }

        $data = $request->validate([
            'checked_in_by_guard_id' => 'nullable|exists:users,id',
        ]);

        $guestReservation->update([
            'entry_time' => now(),
            'checked_in_by_guard_id' => $data['checked_in_by_guard_id'] ?? null,
        ]);

        $guestReservation->load($this->relations);

        return new GuestReservationResource($guestReservation);
    }

    public function destroy(GuestReservation $guestReservation)
    {
        $guestReservation->delete();

        return response()->json(['message' => 'GuestReservation deleted successfully']);
    }

    protected function applyDateRangeFilter($query, Request $request, string $field)
    {
        if (!$request->filled('dateRange')) {
            return $query;
        }

        $now = Carbon::now();

        switch ($request->dateRange) {
            case 'today':
                $query->whereDate($field, $now->toDateString());
                break;
            case 'yesterday':
                $query->whereDate($field, Carbon::yesterday()->toDateString());
                break;
            case 'thisWeek':
                $query->whereBetween($field, [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()]);
                break;
            case 'last7Days':
                $query->where($field, '>=', Carbon::now()->subDays(7)->startOfDay());
                break;
            case 'last30Days':
                $query->where($field, '>=', Carbon::now()->subDays(30)->startOfDay());
                break;
            case 'thisMonth':
                $query->whereMonth($field, $now->month)->whereYear($field, $now->year);
                break;
            case 'last3Months':
                $query->where($field, '>=', Carbon::now()->subMonths(3)->startOfDay());
                break;
            case 'custom':
                if ($request->filled('customStart') && $request->filled('customEnd')) {
                    $query->whereBetween($field, [
                        Carbon::parse($request->customStart)->startOfDay(),
                        Carbon::parse($request->customEnd)->endOfDay(),
                    ]);
                }
                break;
        }

        return $query;
    }

    protected function applyFilters($query, Request $request)
    {
        if ($request->filled('section')) {
            $query->where('section', $request->section);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('entry_type')) {
            $query->where('entry_type', $request->entry_type);
        }

        if ($request->has('has_entry')) {
            $request->boolean('has_entry')
                ? $query->whereNotNull('entry_time')
                : $query->whereNull('entry_time');
        }

        if ($request->has('has_exit')) {
            $request->boolean('has_exit')
                ? $query->whereNotNull('exit_time')
                : $query->whereNull('exit_time');
        }

        if ($request->filled('status')) {
            switch ($request->status) {
                case 'checked_in':
                    $query->whereNotNull('entry_time')->whereNull('exit_time');
                    break;
                case 'checked_out':
                    $query->whereNotNull('exit_time');
                    break;
                case 'overdue':
                    $query->whereNotNull('entry_time')
                        ->whereNull('exit_time')
                        ->whereNotNull('check_out')
                        ->where('check_out', '<', now());
                    break;
                case 'vip':
                    $query->where(function ($q) {
                        $q->whereNotNull('dream_pass_code')
                            ->orWhere('is_express_check_in', true);
                    });
                    break;
                case 'not_checked_in':
                    $query->whereNull('entry_time');
                    break;
            }
        }

        if ($request->filled('bills_status')) {
            if ($request->bills_status === 'cleared') {
                $query->where('cleared_bills->is_cleared', true);
            } elseif ($request->bills_status === 'pending') {
                $query->where(function ($q) {
                    $q->whereNull('cleared_bills')
                        ->orWhere('cleared_bills->is_cleared', false)
                        ->orWhereJsonDoesntContainKey('cleared_bills->is_cleared');
                });
            }
        }

        if ($request->filled('housekeeping_status')) {
            if ($request->housekeeping_status === 'cleared') {
                $query->where('cleared_by_house_keeping->is_cleared', true);
            } elseif ($request->housekeeping_status === 'pending') {
                $query->where(function ($q) {
                    $q->whereNull('cleared_by_house_keeping')
                        ->orWhere('cleared_by_house_keeping->is_cleared', false)
                        ->orWhereJsonDoesntContainKey('cleared_by_house_keeping->is_cleared');
                });
            }
        }

        if ($request->filled('dateField') && $request->filled('dateRange')) {
            $field = in_array($request->dateField, ['check_in', 'check_out', 'entry_time', 'exit_time', 'created_at'])
                ? $request->dateField
                : 'created_at';
            $this->applyDateRangeFilter($query, $request, $field);
        }

        return $query;
    }
}