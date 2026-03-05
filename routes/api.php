<?php

use App\Http\Controllers\AgentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DreamPassController;
use App\Http\Controllers\DreamPassRedemptionController;
use App\Http\Controllers\OpportunityFileController;
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
use App\Http\Controllers\GuestController;
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
Route::apiResource('contacts', ContactController::class)->withoutMiddleware([\App\Http\Middleware\CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
Route::apiResource('posts', PostController::class);
Route::apiResource('packages', PackageController::class);
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
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])->withoutMiddleware([\App\Http\Middleware\CheckAuthenticated::class]);
Route::post('/auth/forgot-password', [AuthController::class, 'sendPasswordReset'])->withoutMiddleware([\App\Http\Middleware\CheckAuthenticated::class]);




//gate system
Route::apiResource('guests', GuestController::class);

Route::apiResource('check-points', CheckPointController::class);


Route::apiResource('guards', GuardController::class);

Route::apiResource('patrols', PatrolController::class);



//app gate system
Route::prefix('v1')->group(function () {
    Route::post('/auth/send-otp', [AuthController::class, 'sendOTP'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOTP'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::post('/auth/register', [AuthController::class, 'register'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::post('/auth/login', [AuthController::class, 'login'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotAppPassword'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::post('/auth/reset-password', [AuthController::class, 'resetAppPassword'])->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);


    Route::apiResource('app-patrols', PatrolController::class)->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);

    Route::post('patrols/{patrol}/scan', [PatrolController::class, 'scan']);
    Route::patch('patrols/{patrol}/complete', [PatrolController::class, 'complete']);

    Route::apiResource('patrols', PatrolController::class)->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::apiResource('guards', GuardController::class)->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::apiResource('check-points', CheckPointController::class)->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
    Route::apiResource('guests', GuestController::class)->withoutMiddleware([CheckAuthenticated::class, EnsureFrontendRequestsAreStateful::class]);
});