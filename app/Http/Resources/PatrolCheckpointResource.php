<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatrolCheckpointResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'patrol_id' => $this->patrol_id,
            'checkpoint' => new CheckPointResource($this->whenLoaded('checkPoint')),
            'scanned_at' => $this->scanned_at,
            'created_at' => $this->created_at,
        ];
    }
}