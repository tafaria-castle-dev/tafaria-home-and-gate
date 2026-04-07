<?php

namespace App\Http\Controllers;

use App\Mail\OTPEmail;
use App\Models\OTP;
use App\Models\User;
use App\Services\ResetPasswordEmailService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    protected $emailService;

    public function __construct(ResetPasswordEmailService $emailService)
    {
        $this->emailService = $emailService;
    }

    public function sendPasswordReset(Request $request): RedirectResponse
    {
        try {
            $data = $request->validate([
                'email' => 'required|email',
            ]);

            $user = User::where('email', $data['email'])->first();

            if (!$user) {
                return back()->withErrors(['email' => 'No user with that email exists']);
            }

            $resetToken = Str::random(60);
            $hashedToken = Hash::make($resetToken);
            $expiresAt = now()->addHours(24);

            $user->update([
                'password_reset_token' => $hashedToken,
                'password_reset_expires' => $expiresAt,
            ]);

            try {
                $resetUrl = config('app.url') . "/reset-password?token={$resetToken}&email={$user->email}";
                $this->emailService->sendPasswordReset($user, $resetUrl);

                return back()->with('status', 'Password reset link sent to your email!');
            } catch (\Exception $err) {
                $user->update([
                    'password_reset_token' => null,
                    'password_reset_expires' => null,
                ]);

                \Log::error('Error sending password reset email: ' . $err->getMessage());
                \Log::error('Error sending password reset email: ' . $err->getMessage());
                return back()->withErrors(['email' => 'Error sending email. Please try again.']);
            }
        } catch (\Exception $err) {
            \Log::error('Error in password reset: ' . $err->getMessage());
            return back()->withErrors(['email' => 'Error sending email. Please try again.']);
        }
    }
    public function resetPassword(Request $request): RedirectResponse
    {
        try {
            $data = $request->validate([
                'token' => 'required|string',
                'password' => 'required|string|min:8|confirmed',
                'email' => 'required|string',
            ]);
            $user = User::where('email', $data['email'])
                ->where('password_reset_expires', '>', now())
                ->where('password_reset_token', '!=', null)
                ->first();

            if (!$user || !Hash::check($data['token'], $user->password_reset_token)) {
                return back()->withErrors(['email' => 'Token is invalid or has expired']);
            }



            $user->update([
                'password' => Hash::make($data['password']),
                'password_reset_token' => null,
                'password_reset_expires' => null,
                'password_changed_at' => now(),
            ]);

            return redirect()->route('login')->with('status', 'Password reset successfully!');
        } catch (\Exception $err) {
            \Log::error('Error in password reset: ' . $err->getMessage());
            return back()->withErrors(['reset' => 'Error resetting password. Please try again.']);
        }
    }
    // flutter app methods
    public function sendOTP(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'name' => ['required', 'string'],
            'otp' => ['required', 'string', 'size:6'],
            'type' => ['required', 'in:registration,forgotPassword'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'msg' => $validator->errors()->first(),
            ], 422);
        }

        try {
            OTP::updateOrCreate(
                ['email' => $request->email],
                [
                    'otp' => $request->otp,
                    'expires_at' => Carbon::now()->addMinutes(10),
                    'type' => $request->type,
                ]
            );

            Mail::to($request->email)->send(
                new OTPEmail(
                    $request->name,
                    $request->otp,
                    'accountActivationApp'
                )
            );

            return response()->json([
                'msg' => 'OTP sent successfully',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'msg' => 'Failed to send OTP. Please try again.',
            ], 500);
        }
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'phone_number' => ['required', 'string', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'msg' => $validator->errors()->first(),
            ], 422);
        }

        try {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'phone_number' => $request->phone_number,
                'password' => Hash::make($request->password),
                'role' => $request->role ?? 'user',
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            OTP::where('email', $request->email)->delete();

            return response()->json([
                'msg' => 'Account creation was successful!',
                'token' => $token,
                'user' => [
                    '_id' => (string) $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'role' => $user->role,
                ],
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'msg' => 'Registration failed. Please try again.',
            ], 500);
        }
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'msg' => $validator->errors()->first(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'msg' => 'Email not registered!',
            ], 401);
        }
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'msg' => 'Wrong Password Entered!',
            ], 401);
        }

        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'msg' => 'Login successful!',
            'token' => $token,
            'user' => [
                '_id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'role' => $user->role,
            ],
        ], 200);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'msg' => 'Logged out successfully',
        ], 200);
    }

    public function user(Request $request)
    {
        return response()->json([
            'user' => [
                '_id' => (string) $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'phone_number' => $request->user()->phone_number,
                'role' => $request->user()->role,
            ],
        ], 200);
    }

    public function verifyOTP(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'otp' => ['required', 'string', 'size:6'],
            'type' => ['required', 'in:registration,forgotPassword'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'msg' => $validator->errors()->first(),
            ], 422);
        }

        $otpRecord = OTP::where('email', $request->email)
            ->where('otp', $request->otp)
            ->where('type', $request->type)
            ->first();

        if (!$otpRecord) {
            return response()->json([
                'msg' => 'Invalid OTP',
            ], 401);
        }

        if (Carbon::now()->greaterThan($otpRecord->expires_at)) {
            $otpRecord->delete();
            return response()->json([
                'msg' => 'OTP has expired',
            ], 401);
        }

        return response()->json([
            'msg' => 'OTP verified successfully',
        ], 200);
    }

    public function forgotAppPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email', 'exists:users,email'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'msg' => $validator->errors()->first(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        try {
            OTP::updateOrCreate(
                ['email' => $request->email],
                [
                    'otp' => $otp,
                    'expires_at' => Carbon::now()->addMinutes(10),
                    'type' => 'forgotPassword',
                ]
            );

            Mail::to($request->email)->send(
                new OTPEmail(
                    $user->name,
                    $otp,
                    'forgotPasswordApp'
                )
            );

            return response()->json([
                'msg' => 'Password reset OTP sent to your email',
                'otp' => $otp,
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'msg' => 'Failed to send OTP. Please try again.',
            ], 500);
        }
    }

    public function resetAppPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'otp' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'msg' => $validator->errors()->first(),
            ], 422);
        }

        $otpRecord = OTP::where('email', $request->email)
            ->where('otp', $request->otp)
            ->where('type', 'forgotPassword')
            ->first();

        if (!$otpRecord) {
            return response()->json([
                'msg' => 'Invalid OTP',
            ], 401);
        }

        if (Carbon::now()->greaterThan($otpRecord->expires_at)) {
            $otpRecord->delete();
            return response()->json([
                'msg' => 'OTP has expired',
            ], 401);
        }

        $user = User::where('email', $request->email)->first();
        $user->password = Hash::make($request->password);
        $user->save();

        $otpRecord->delete();

        return response()->json([
            'msg' => 'Password reset successful',
        ], 200);
    }

    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => ['required'],
            'new_password' => ['required', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'msg' => $validator->errors()->first(),
            ], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'msg' => 'Current password is incorrect',
            ], 401);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json([
            'msg' => 'Password changed successfully',
        ], 200);
    }
}