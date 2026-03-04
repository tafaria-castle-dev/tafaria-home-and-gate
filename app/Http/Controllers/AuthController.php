<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ResetPasswordEmailService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
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
}