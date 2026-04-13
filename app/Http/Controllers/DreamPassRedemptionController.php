<?php

namespace App\Http\Controllers;

use App\Models\DreamPass;
use App\Models\DreamPassActivity;
use App\Models\DreamPassActivityRedemption;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DreamPassRedemptionController extends Controller
{
    public function redeemActivity(Request $request)
    {
        $request->validate([
            'room_number' => 'required|string',
            'activity_name' => 'required|string',
            'redemption_date' => 'required|date',
            'staff_passcode' => 'required|string',
            'count' => 'nullable|integer|min:1|max:50',
        ]);

        $count = $request->integer('count', 1);

        $dreamPass = DreamPass::where('room_number', $request->room_number)->latest()->first();

        if (!$dreamPass) {
            return response()->json([
                'message' => 'Room number not found'
            ], 404);
        }

        if ($dreamPass->status !== 'approved') {
            return response()->json([
                'message' => 'Dream pass is not approved'
            ], 422);
        }

        $activity = DreamPassActivity::where('dream_pass_id', $dreamPass->id)
            ->where('activity_name', $request->activity_name)
            ->first();

        if (!$activity) {
            return response()->json([
                'message' => 'Activity not found for this dream pass'
            ], 404);
        }

        $redemptionDate = Carbon::parse($request->redemption_date);
        $validFrom = Carbon::parse($activity->valid_from);
        $validTo = Carbon::parse($activity->valid_to);

        if ($redemptionDate->lt($validFrom)) {
            return response()->json([
                'message' => 'Voucher is not yet valid. Valid from: ' . $validFrom->format('Y-m-d')
            ], 422);
        }

        if ($redemptionDate->gt($validTo)) {
            return response()->json([
                'message' => 'Voucher has expired. Valid until: ' . $validTo->format('Y-m-d')
            ], 422);
        }

        $redeemedToday = DreamPassActivityRedemption::where('dream_pass_activity_id', $activity->id)
            ->whereDate('redeemed_at', $request->redemption_date)
            ->count();

        $remainingToday = $activity->voucher_count - $redeemedToday;

        if ($remainingToday < $count) {
            return response()->json([
                'message' => "Not enough vouchers remaining today. Only {$remainingToday} left."
            ], 422);
        }

        $staff = Auth::user();

        if (!$staff) {
            $bearerToken = $request->bearerToken();
            if (!$bearerToken) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            $tokenRecord = \Laravel\Sanctum\PersonalAccessToken::findToken($bearerToken);
            if (!$tokenRecord) {
                return response()->json(['message' => 'Invalid token.'], 401);
            }

            $staff = $tokenRecord->tokenable;
        }

        if (!$staff) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (!Hash::check($request->staff_passcode, $staff->pass_code ?? '')) {
            return response()->json(['message' => 'Wrong passcode entered!'], 422);
        }

        $redemptions = [];
        for ($i = 0; $i < $count; $i++) {
            $redemptions[] = [
                'dream_pass_activity_id' => $activity->id,
                'redeemed_at' => $request->redemption_date . ' ' . now()->format('H:i:s'),
                'redeemed_by_staff_id' => $staff->id,
                'staff_passcode' => $request->staff_passcode,
            ];
        }

        DreamPassActivityRedemption::insert($redemptions);

        return response()->json([
            'message' => "Successfully redeemed {$count} voucher(s) for {$activity->activity_name}"
        ]);
    }
}