<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatrolResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'guard' => new GuardResource($this->whenLoaded('guard')),
            'status' => $this->status,
            'started_at' => $this->started_at,
            'ended_at' => $this->ended_at,
            'scans' => PatrolCheckpointResource::collection($this->whenLoaded('patrolCheckpoints')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}