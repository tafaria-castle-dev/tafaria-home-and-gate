<?php

use App\Http\Controllers\AgentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DreamPassController;
use App\Http\Controllers\DreamPassRedemptionController;
use App\Http\Controllers\ImmersionPackageController;
use App\Http\Controllers\OpportunityFileController;
use App\Http\Controllers\PatrolIncidentController;
use App\Http\Controllers\PatrolShiftController;
use App\Http\Controllers\RatesEmailController;
use App\Http\Middleware\CheckAuthenticated;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BulkEmailAttachmentController;
use App\Http\Controllers\BulkEmailController;
use App\Http\Controllers\EmailTemplateController;
use App\Http\Controllers\OpportunityNameController;
use App\Http\Controllers\FileUploadController;
use App\Http\Controllers\EmailAttachmentController;
use App\Http\Controllers\EmailActivityController;
use App\Http\Controllers\CallLogController;
use App\Http\Controllers\OpportunityController;
use App\Http\Controllers\LastUpdateController;
use App\Http\Controllers\VerificationTokenController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\ContactPersonController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\CorporateRoomSettingController;
use App\Http\Controllers\TaxController;
use App\Http\Controllers\DiscountController;
use App\Http\Controllers\AdditionalController;
use App\Http\Controllers\AccommodationNoteController;
use App\Http\Controllers\ReservationController;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;


use App\Http\Controllers\CheckPointController;
use App\Http\Controllers\GuestReservationController;
use App\Http\Controllers\GuardController;
use App\Http\Controllers\PatrolController;



Route::apiResource('users', UserController::class);
Route::apiResource('bulk-email-attachments', BulkEmailAttachmentController::class);
Route::apiResource('bulk-emails', BulkEmailController::class);
Route::apiResource('email-templates', EmailTemplateController::class);
Route::apiResource('opportunity-names', OpportunityNameController::class);
Route::apiResource('file-uploads', FileUploadController::class);
Route::apiResource('email-attachments', EmailAttachmentController::class);
Route::apiResource('email-activities', EmailActivityController::class);
Route::apiResource('call-logs', CallLogController::class);
Route::apiResource('opportunities', OpportunityController::class);
Route::apiResource('opportunity-files', OpportunityFileController::class);
Route::apiResource('last-updates', LastUpdateController::class);
Route::apiResource('verification-tokens', VerificationTokenController::class);
Route::apiResource('bookings', BookingController::class);
Route::apiResource('quotations', QuotationController::class);
Route::apiResource('customers', CustomerController::class);
Route::apiResource('contact-persons', ContactPersonController::class);
Route::apiResource('contacts', ContactController::class)->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
Route::apiResource('posts', PostController::class);
Route::apiResource('packages', PackageController::class);
Route::apiResource('immersion-packages', ImmersionPackageController::class);
Route::apiResource('corporate-room-settings', CorporateRoomSettingController::class);
Route::apiResource('taxes', TaxController::class);
Route::apiResource('discounts', DiscountController::class);
Route::apiResource('additionals', AdditionalController::class);
Route::apiResource('accommodation-notes', AccommodationNoteController::class);
Route::apiResource('reservations', ReservationController::class);
Route::apiResource('agents', AgentController::class);
Route::apiResource('rates-emails', RatesEmailController::class);

Route::post('/dream-passes/redeem-activity', [DreamPassRedemptionController::class, 'redeemActivity']);
Route::get('/dream-passes', [DreamPassController::class, 'index']);
Route::post('/dream-passes', [DreamPassController::class, 'store']);
Route::get('/dream-passes/{id}', [DreamPassController::class, 'show']);
Route::put('/dream-passes/{id}', [DreamPassController::class, 'update']);
Route::delete('/dream-passes/{id}', [DreamPassController::class, 'destroy']);
Route::post('/dream-passes/{id}/approve', [DreamPassController::class, 'approve']);
Route::post('/dream-passes/{id}/reject', [DreamPassController::class, 'reject']);
Route::post('/dream-passes/{id}/draft', [DreamPassController::class, 'draft']);
Route::post('/dream-passes/{id}/pending', [DreamPassController::class, 'pending']);

Route::post('/admin/create-dream-pass', [DreamPassController::class, 'sendCreateDreamPassNotification']);


Route::post('/admin/approve-quotation', [QuotationController::class, 'approveQuotation']);
Route::post('/admin/draft-notification', [QuotationController::class, 'sendCreateDraftNotification']);
Route::post('/admin/notification', [QuotationController::class, 'sendCreateQuotationNotification']);
Route::post('/admin/invoice-generate', [QuotationController::class, 'sendGenerateInvoiceNotification']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])->withoutMiddleware([CheckAuthenticated::class]);
Route::post('/auth/forgot-password', [AuthController::class, 'sendPasswordReset'])->withoutMiddleware([CheckAuthenticated::class]);




//gate system


Route::get('/guest-reservations/aggregations', [GuestReservationController::class, 'aggregations']);
Route::patch('/guest-reservations/{guestReservation}/check-out', [GuestReservationController::class, 'checkOut']);
Route::apiResource('guest-reservations', GuestReservationController::class);

Route::post('check-points/{id}/regenerate-qr', [CheckPointController::class, 'regenerateQr']);
Route::apiResource('check-points', CheckPointController::class);


Route::apiResource('guards', GuardController::class);

Route::prefix('patrols')->group(function () {
    Route::get('/', [PatrolController::class, 'index']);
    Route::get('/by-guard', [PatrolController::class, 'byGuard']);
    Route::get('/aggregations', [PatrolController::class, 'aggregations']);
    Route::post('/start', [PatrolController::class, 'start']);
    Route::post('/scan-qr', [PatrolController::class, 'scanByQr']);
    Route::get('/{id}', [PatrolController::class, 'show']);
    Route::post('/{id}/scan', [PatrolController::class, 'scan']);
    Route::patch('/{id}/end', [PatrolController::class, 'end']);
    Route::patch('/{id}/missed', [PatrolController::class, 'markMissed']);
    Route::delete('/{id}', [PatrolController::class, 'destroy']);
});
Route::apiResource('patrol-shifts', PatrolShiftController::class);
Route::prefix('patrol-incidents')->group(function () {
    Route::get('/', [PatrolIncidentController::class, 'index']);
    Route::get('/aggregations', [PatrolIncidentController::class, 'aggregations']);
    Route::post('/', [PatrolIncidentController::class, 'store']);
    Route::get('/{id}', [PatrolIncidentController::class, 'show']);
    Route::patch('/{id}/resolve', [PatrolIncidentController::class, 'resolve']);
    Route::patch('/{id}/status', [PatrolIncidentController::class, 'updateStatus']);
    Route::delete('/{id}', [PatrolIncidentController::class, 'destroy']);
});


//app gate system
Route::prefix('v1')->group(function () {
    Route::post('/auth/send-otp', [AuthController::class, 'sendOTP'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOTP'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::post('/auth/register', [AuthController::class, 'register'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::post('/auth/login', [AuthController::class, 'login'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotAppPassword'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::post('/auth/reset-password', [AuthController::class, 'resetAppPassword'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);



    Route::prefix('patrols')->group(function () {
        Route::get('/', [PatrolController::class, 'index'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
        ;

        Route::post('/start', [PatrolController::class, 'start'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
        ;
        Route::post('/scan-qr', [PatrolController::class, 'scanByQr'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
        ;
        Route::post('/patrol-incidents/report', [PatrolIncidentController::class, 'store'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
        Route::get('/{id}', [PatrolController::class, 'show'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
        ;
        Route::patch('/{id}/end', [PatrolController::class, 'end'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
        ;
        Route::patch('/{id}/missed', [PatrolController::class, 'markMissed'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    });
    Route::prefix('patrol-shifts')->group(function () {
        Route::get('/', [PatrolShiftController::class, 'index'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
        Route::get('/{id}', [PatrolShiftController::class, 'show'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    });



    Route::get('/guest-reservations/aggregations', [GuestReservationController::class, 'aggregations']);
    Route::patch('/guest-reservations/{guestReservation}/check-out', [GuestReservationController::class, 'checkOut'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::patch('/guest-reservations/{guestReservation}/check-in', [GuestReservationController::class, 'checkIn'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::apiResource('guest-reservations', GuestReservationController::class)->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);


});
