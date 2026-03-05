<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'guest_name' => $this->guest_name,
            'section' => $this->section,
            'entry_time' => $this->entry_time,
            'exit_time' => $this->exit_time,
            'check_in' => $this->check_in,
            'check_out' => $this->check_out,
            'contact_id' => $this->contact_id,
            'contact_person_id' => $this->contact_person_id,
            'contact' => $this->whenLoaded('contact'),
            'contact_person' => $this->whenLoaded('contactPerson'),
            'phone_number' => $this->phone_number,
            'kids_count' => $this->kids_count,
            'adults_count' => $this->adults_count,
            'dream_pass_code' => $this->dream_pass_code,
            'is_express_check_in' => $this->is_express_check_in,
            'is_express_check_out' => $this->is_express_check_out,
            'type' => $this->type,
            'checked_in_by_user_id' => $this->checked_in_by_user_id,
            'checked_in_by_guard_id' => $this->checked_in_by_guard_id,
            'checked_in_by_user' => $this->whenLoaded('checkedInByUser'),
            'checked_in_by_guard' => $this->whenLoaded('checkedInByGuard'),
            'cleared_bills' => $this->cleared_bills,
            'cleared_bills_by_user_id' => $this->cleared_bills_by_user_id,
            'cleared_bills_by_user' => $this->whenLoaded('clearedBillsByUser'),
            'cleared_by_house_keeping' => $this->cleared_by_house_keeping,
            'cleared_by_house_keeping_user_id' => $this->cleared_by_house_keeping_user_id,
            'cleared_by_house_keeping_user' => $this->whenLoaded('clearedByHouseKeepingUser'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}