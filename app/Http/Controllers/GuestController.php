<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\GuestResource;
use App\Models\Guest;
use Illuminate\Http\Request;

class GuestController extends Controller
{
    protected array $relations = [
        'contact',
        'contactPerson',
        'checkedInByUser',
        'checkedInByGuard',
        'clearedBillsByUser',
        'clearedByHouseKeepingUser',
    ];

    public function index()
    {
        return GuestResource::collection(
            Guest::with($this->relations)->latest()->paginate(20)
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'guest_name' => 'required|string|max:255',
            'section' => 'required|string|max:255',
            'entry_time' => 'nullable|date',
            'exit_time' => 'nullable|date',
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date',
            'contact_id' => 'nullable|exists:contacts,id',
            'contact_person_id' => 'nullable|exists:contact_persons,id',
            'phone_number' => 'nullable|string|max:255',
            'kids_count' => 'required|integer|min:0',
            'adults_count' => 'required|integer|min:1',
            'dream_pass_code' => 'nullable|string|max:255',
            'is_express_check_in' => 'boolean',
            'is_express_check_out' => 'boolean',
            'type' => 'required|in:walk_in,drive_in',
            'checked_in_by_user_id' => 'nullable|exists:users,id',
            'checked_in_by_guard_id' => 'nullable|exists:guards,id',
            'cleared_bills' => 'nullable|array',
            'cleared_bills.is_cleared' => 'nullable|boolean',
            'cleared_bills.comments' => 'nullable|string',
            'cleared_bills_by_user_id' => 'nullable|exists:users,id',
            'cleared_by_house_keeping' => 'nullable|array',
            'cleared_by_house_keeping.is_cleared' => 'nullable|boolean',
            'cleared_by_house_keeping.comments' => 'nullable|string',
            'cleared_by_house_keeping_user_id' => 'nullable|exists:users,id',
        ]);

        $guest = Guest::create($data);
        $guest->load($this->relations);

        return new GuestResource($guest);
    }

    public function show(Guest $guest)
    {
        $guest->load($this->relations);

        return new GuestResource($guest);
    }

    public function update(Request $request, Guest $guest)
    {
        $data = $request->validate([
            'guest_name' => 'sometimes|string|max:255',
            'section' => 'sometimes|string|max:255',
            'entry_time' => 'nullable|date',
            'exit_time' => 'nullable|date',
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date',
            'contact_id' => 'nullable|exists:contacts,id',
            'contact_person_id' => 'nullable|exists:contact_persons,id',
            'phone_number' => 'nullable|string|max:255',
            'kids_count' => 'sometimes|integer|min:0',
            'adults_count' => 'sometimes|integer|min:1',
            'dream_pass_code' => 'nullable|string|max:255',
            'is_express_check_in' => 'boolean',
            'is_express_check_out' => 'boolean',
            'type' => 'sometimes|in:walk_in,drive_in',
            'checked_in_by_user_id' => 'nullable|exists:users,id',
            'checked_in_by_guard_id' => 'nullable|exists:guards,id',
            'cleared_bills' => 'nullable|array',
            'cleared_bills.is_cleared' => 'nullable|boolean',
            'cleared_bills.comments' => 'nullable|string',
            'cleared_bills_by_user_id' => 'nullable|exists:users,id',
            'cleared_by_house_keeping' => 'nullable|array',
            'cleared_by_house_keeping.is_cleared' => 'nullable|boolean',
            'cleared_by_house_keeping.comments' => 'nullable|string',
            'cleared_by_house_keeping_user_id' => 'nullable|exists:users,id',
        ]);

        $guest->update($data);
        $guest->load($this->relations);

        return new GuestResource($guest);
    }

    public function destroy(Guest $guest)
    {
        $guest->delete();

        return response()->json(['message' => 'Guest deleted successfully']);
    }
}