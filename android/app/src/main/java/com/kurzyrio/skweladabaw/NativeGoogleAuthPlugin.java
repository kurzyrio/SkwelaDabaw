package com.kurzyrio.skweladabaw;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialProviderConfigurationException;
import androidx.credentials.exceptions.GetCredentialUnsupportedException;
import androidx.credentials.exceptions.NoCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.tasks.Task;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import com.google.firebase.FirebaseNetworkException;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseAuthWebException;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.google.firebase.auth.OAuthCredential;
import com.google.firebase.auth.OAuthProvider;
import com.google.firebase.auth.UserInfo;

import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * NativeGoogleAuthPlugin
 * 
 * Hardened native Google Sign-In bridge for Android, specifically optimized for
 * Xiaomi (MIUI / HyperOS), Samsung OneUI, and vanilla Android devices.
 * 
 * Key Architecture:
 * 1. Uses GetSignInWithGoogleOption (never filtered by authorized accounts) to reliably
 *    prompt the Google account picker dialog.
 * 2. Binds CredentialManager directly to the active Activity context (NOT applicationContext)
 *    to prevent MIUI / HyperOS from dropping dialog window tokens.
 * 3. Provides seamless automatic fallback to legacy GoogleSignInClient (play-services-auth)
 *    if CredentialManager throws GetCredentialException (excluding explicit user cancellations).
 * 4. Authenticates native Firebase Auth and passes the Google ID Token back to Firebase JS SDK
 *    to preserve user UIDs, database sessions, and timetable schedule sync.
 */
@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {

    private static final String TAG = "SkwelaGoogleAuth";
    private static final String DEFAULT_WEB_CLIENT_ID = "981655805429-f16f8mrme8snjr02mnapmj27ln3ofb2a.apps.googleusercontent.com";
    private static final ExecutorService CREDENTIAL_EXECUTOR = Executors.newSingleThreadExecutor();

    private String getServerClientId(@Nullable PluginCall call) {
        if (call != null) {
            String fromCall = call.getString("serverClientId");
            if (fromCall != null && !fromCall.trim().isEmpty()) {
                return fromCall.trim();
            }
            String fromCallWeb = call.getString("webClientId");
            if (fromCallWeb != null && !fromCallWeb.trim().isEmpty()) {
                return fromCallWeb.trim();
            }
        }

        try {
            Context context = getContext();
            if (context != null) {
                int resId = context.getResources().getIdentifier("default_web_client_id", "string", context.getPackageName());
                if (resId != 0) {
                    String str = context.getString(resId);
                    if (str != null && !str.trim().isEmpty()) {
                        return str.trim();
                    }
                }
            }
        } catch (Exception ignored) {}

        return DEFAULT_WEB_CLIENT_ID;
    }

    private boolean isGooglePlayServicesAvailable(@Nullable Context context) {
        if (context == null) {
            return false;
        }
        try {
            int status = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context);
            return status == ConnectionResult.SUCCESS;
        } catch (Throwable t) {
            Log.w(TAG, "Unable to verify Google Play Services availability: " + t.getMessage());
            return false;
        }
    }

    private boolean isMissingPlayServicesCredentialError(@Nullable GetCredentialException exception) {
        if (exception == null) {
            return false;
        }
        if (exception instanceof GetCredentialUnsupportedException) {
            return true;
        }
        String msg = exception.getMessage();
        if (msg == null) {
            return false;
        }
        String lower = msg.toLowerCase(Locale.ROOT);
        return lower.contains("play services")
            || lower.contains("gms")
            || lower.contains("service_missing")
            || lower.contains("service_disabled")
            || lower.contains("service_invalid")
            || lower.contains("not supported on this device")
            || (exception instanceof GetCredentialProviderConfigurationException && !isGooglePlayServicesAvailable(getActivity()));
    }

    private boolean isPlayServicesUnavailableStatus(int statusCode) {
        return statusCode == ConnectionResult.SERVICE_MISSING
            || statusCode == ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED
            || statusCode == ConnectionResult.SERVICE_DISABLED
            || statusCode == ConnectionResult.SERVICE_INVALID
            || statusCode == CommonStatusCodes.API_NOT_CONNECTED
            || statusCode == CommonStatusCodes.INTERNAL_ERROR
            || statusCode == GoogleSignInStatusCodes.SIGN_IN_FAILED;
    }

    @PluginMethod
    public void signIn(final PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            Log.e(TAG, "Cannot initiate Google Sign-In: Activity is null or finishing.");
            call.reject("Activity context is not available.");
            return;
        }

        // Runtime GMS availability check: automatically fall back to Firebase web OAuth on non-GMS devices (e.g., newer Huawei devices)
        if (!isGooglePlayServicesAvailable(activity)) {
            Log.i(TAG, "Google Play Services unavailable on this device. Falling back to Firebase web OAuth.");
            launchFirebaseWebOAuthSignIn(call);
            return;
        }

        final String serverClientId = getServerClientId(call);
        Log.i(TAG, "Starting Google Sign-In with serverClientId: " + serverClientId);

        // Run on UI thread to guarantee active window attachment for Xiaomi / MIUI / HyperOS
        activity.runOnUiThread(() -> {
            try {
                // 1. Configure GetSignInWithGoogleOption (standard account-picker flow)
                GetSignInWithGoogleOption signInOption = new GetSignInWithGoogleOption.Builder(serverClientId)
                    .build();

                GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(signInOption)
                    .build();

                // 2. Use active Activity context so MIUI/HyperOS does not drop the dialog window token
                CredentialManager credentialManager = CredentialManager.create(activity);

                credentialManager.getCredentialAsync(
                    activity,
                    request,
                    null,
                    CREDENTIAL_EXECUTOR,
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(GetCredentialResponse response) {
                            Credential credential = response.getCredential();
                            if (credential instanceof CustomCredential &&
                                credential.getType().equals(GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL)) {
                                try {
                                    GoogleIdTokenCredential googleIdTokenCredential = 
                                        GoogleIdTokenCredential.createFrom(credential.getData());
                                    String idToken = googleIdTokenCredential.getIdToken();
                                    String email = googleIdTokenCredential.getId();
                                    String displayName = googleIdTokenCredential.getDisplayName();
                                    String photoUrl = googleIdTokenCredential.getProfilePictureUri() != null 
                                        ? googleIdTokenCredential.getProfilePictureUri().toString() 
                                        : null;

                                    Log.i(TAG, "CredentialManager succeeded with GetSignInWithGoogleOption for user: " + email);
                                    handleSuccessfulGoogleSignIn(call, idToken, email, displayName, photoUrl);
                                } catch (Exception e) {
                                    Log.e(TAG, "Failed to parse GoogleIdTokenCredential: " + e.getMessage(), e);
                                    activity.runOnUiThread(() -> launchLegacyGoogleSignIn(call, serverClientId));
                                }
                            } else {
                                Log.w(TAG, "Unexpected credential type: " + credential.getType() + ". Falling back to legacy Google Sign-In.");
                                activity.runOnUiThread(() -> launchLegacyGoogleSignIn(call, serverClientId));
                            }
                        }

                        @Override
                        public void onError(@NonNull GetCredentialException exception) {
                            if (exception instanceof GetCredentialCancellationException) {
                                Log.w(TAG, "User cancelled Google Sign-In dialog (GetCredentialCancellationException).");
                                call.reject("Google Sign-In was cancelled or dismissed.");
                                return;
                            }

                            boolean gmsAvailable = isGooglePlayServicesAvailable(activity);
                            boolean missingPlayServices = !gmsAvailable || isMissingPlayServicesCredentialError(exception);

                            if (exception instanceof NoCredentialException) {
                                if (missingPlayServices) {
                                    Log.w(TAG, "NoCredentialException without Google Play Services: " + exception.getMessage() + ". Launching Firebase web OAuth fallback.");
                                    launchFirebaseWebOAuthSignIn(call);
                                    return;
                                }
                                Log.w(TAG, "NoCredentialException received: " + exception.getMessage() + ". Launching legacy GoogleSignInClient fallback for Xiaomi / MIUI / HyperOS.");
                            } else if (missingPlayServices) {
                                Log.w(TAG, "GetCredentialException (" + exception.getClass().getSimpleName() + ") indicates missing Play Services: " + exception.getMessage() + ". Launching Firebase web OAuth fallback.");
                                launchFirebaseWebOAuthSignIn(call);
                                return;
                            } else {
                                Log.e(TAG, "GetCredentialException (" + exception.getClass().getSimpleName() + "): " + exception.getMessage() + ". Launching legacy GoogleSignInClient fallback.", exception);
                            }

                            // Launch fallback on UI thread
                            activity.runOnUiThread(() -> launchLegacyGoogleSignIn(call, serverClientId));
                        }
                    }
                );
            } catch (Exception e) {
                Log.e(TAG, "Exception during CredentialManager initialization: " + e.getMessage() + ". Launching fallback.", e);
                if (!isGooglePlayServicesAvailable(activity)) {
                    launchFirebaseWebOAuthSignIn(call);
                } else {
                    activity.runOnUiThread(() -> launchLegacyGoogleSignIn(call, serverClientId));
                }
            }
        });
    }

    /**
     * Fallback for devices where CredentialManager fails or is suppressed (e.g., Xiaomi MIUI / HyperOS).
     */
    private void launchLegacyGoogleSignIn(final PluginCall call, final String serverClientId) {
        Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            Log.e(TAG, "Cannot launch legacy Google Sign-In: Activity is null or finishing.");
            call.reject("Activity context is not available.");
            return;
        }

        if (!isGooglePlayServicesAvailable(activity)) {
            Log.i(TAG, "Google Play Services unavailable before legacy fallback. Routing to Firebase web OAuth.");
            launchFirebaseWebOAuthSignIn(call);
            return;
        }

        try {
            Log.i(TAG, "Configuring legacy GoogleSignInClient fallback with client ID: " + serverClientId);

            GoogleSignInOptions.Builder gsoBuilder = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(serverClientId)
                .requestEmail()
                .requestProfile();

            GoogleSignInOptions gso = gsoBuilder.build();
            GoogleSignInClient client = GoogleSignIn.getClient(activity, gso);

            // Force account picker prompt by signing out legacy client session first
            client.signOut().addOnCompleteListener(activity, task -> {
                if (!task.isSuccessful() && task.getException() instanceof ApiException) {
                    int statusCode = ((ApiException) task.getException()).getStatusCode();
                    if (isPlayServicesUnavailableStatus(statusCode)) {
                        Log.w(TAG, "Legacy GoogleSignInClient signOut failed with Play Services status " + statusCode + ". Falling back to Firebase web OAuth.");
                        launchFirebaseWebOAuthSignIn(call);
                        return;
                    }
                }
                try {
                    Intent signInIntent = client.getSignInIntent();
                    startActivityForResult(call, signInIntent, "handleLegacyGoogleSignInResult");
                } catch (Exception launchEx) {
                    Log.e(TAG, "Failed to launch legacy Google Sign-In intent", launchEx);
                    if (launchEx instanceof ActivityNotFoundException || !isGooglePlayServicesAvailable(activity)) {
                        launchFirebaseWebOAuthSignIn(call);
                    } else {
                        call.reject("Failed to open Google account picker: " + launchEx.getMessage());
                    }
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error configuring legacy GoogleSignInClient", e);
            if (!isGooglePlayServicesAvailable(activity)) {
                launchFirebaseWebOAuthSignIn(call);
            } else {
                call.reject("Google Sign-In configuration error: " + e.getMessage());
            }
        }
    }

    @ActivityCallback
    public void handleLegacyGoogleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        int resultCode = result.getResultCode();
        Intent data = result.getData();

        if (data == null) {
            if (!isGooglePlayServicesAvailable(getActivity())) {
                Log.w(TAG, "Legacy Google Sign-In returned empty result without Play Services. Falling back to Firebase web OAuth.");
                launchFirebaseWebOAuthSignIn(call);
                return;
            }
            Log.w(TAG, "Legacy Google Sign-In was cancelled or dismissed by user (resultCode=" + resultCode + ")");
            call.reject("Google Sign-In was cancelled or dismissed.");
            return;
        }

        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            if (resultCode != Activity.RESULT_OK && account == null) {
                Log.w(TAG, "Legacy Google Sign-In was cancelled or dismissed by user (resultCode=" + resultCode + ")");
                call.reject("Google Sign-In was cancelled or dismissed.");
                return;
            }
            if (account == null) {
                Log.e(TAG, "GoogleSignInAccount is null from intent result");
                call.reject("Google Sign-In returned empty account data.");
                return;
            }

            String idToken = account.getIdToken();
            if (idToken == null || idToken.isEmpty()) {
                Log.e(TAG, "GoogleSignInAccount returned null or empty idToken. Verify default_web_client_id matches Firebase Console.");
                call.reject("Google Sign-In returned null ID token. Check Web Client ID configuration.");
                return;
            }

            Log.i(TAG, "Legacy Google Sign-In succeeded for user: " + account.getEmail());
            handleSuccessfulGoogleSignIn(
                call, 
                idToken, 
                account.getEmail(), 
                account.getDisplayName(), 
                account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : null
            );
        } catch (ApiException e) {
            int statusCode = e.getStatusCode();
            String statusMessage = GoogleSignInStatusCodes.getStatusCodeString(statusCode);
            Log.e(TAG, "Legacy Google Sign-In failed with ApiException status code: " + statusCode + " (" + statusMessage + ")", e);

            if (statusCode == GoogleSignInStatusCodes.SIGN_IN_CANCELLED || statusCode == CommonStatusCodes.CANCELED) {
                call.reject("Google Sign-In was cancelled or dismissed.");
            } else if (isPlayServicesUnavailableStatus(statusCode) || !isGooglePlayServicesAvailable(getActivity())) {
                Log.w(TAG, "Legacy Google Sign-In unavailable (status " + statusCode + "). Falling back to Firebase web OAuth.");
                launchFirebaseWebOAuthSignIn(call);
            } else if (statusCode == CommonStatusCodes.DEVELOPER_ERROR) {
                // Code 10: Missing SHA-1 fingerprint in Firebase Console
                Log.e(TAG, "CRITICAL: Developer Error (status code 10). The app signing SHA-1 fingerprint must be registered in the Firebase Console under Project Settings -> Android Apps!");
                call.reject("Google Sign-In configuration error (Code 10: Developer Error). Please verify SHA-1 fingerprint in Firebase Console.");
            } else if (statusCode == CommonStatusCodes.NETWORK_ERROR) {
                call.reject("Network error during Google Sign-In. Please check your internet connection.");
            } else {
                call.reject("Google Sign-In error (Code " + statusCode + "): " + e.getMessage());
            }
        } catch (Exception ex) {
            Log.e(TAG, "Unexpected error in legacy Google Sign-In result handling", ex);
            if (!isGooglePlayServicesAvailable(getActivity())) {
                launchFirebaseWebOAuthSignIn(call);
            } else {
                call.reject("Google Sign-In unexpected error: " + ex.getMessage());
            }
        }
    }

    /**
     * Web-based Firebase OAuth fallback for devices without Google Play Services (e.g., newer Huawei devices)
     * or when native Play Services sign-in fails due to missing/unavailable Play Services.
     * Uses only the existing Firebase Auth SDK without any HMS or third-party OAuth dependencies.
     */
    private void launchFirebaseWebOAuthSignIn(final PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            Log.e(TAG, "Cannot initiate Firebase web OAuth Sign-In: Activity is null or finishing.");
            call.reject("Activity context is not available.");
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                final FirebaseAuth firebaseAuth = FirebaseAuth.getInstance();
                final OAuthProvider provider = OAuthProvider.newBuilder("google.com")
                    .addCustomParameter("prompt", "select_account")
                    .build();

                Task<AuthResult> pendingResultTask = firebaseAuth.getPendingAuthResult();
                if (pendingResultTask != null) {
                    Log.i(TAG, "Found pending Firebase OAuth result. Resolving before launching a new web OAuth flow.");
                    pendingResultTask
                        .addOnSuccessListener(authResult -> {
                            Log.i(TAG, "Pending Firebase web OAuth Sign-In succeeded.");
                            handleAuthenticatedAuthResult(call, authResult, null, null, null, null, "firebase_web_oauth");
                        })
                        .addOnFailureListener(pendingEx -> {
                            Log.w(TAG, "Previous pending Firebase OAuth result failed (" + pendingEx.getMessage() + "). Launching fresh web OAuth flow.");
                            startFirebaseWebOAuthProvider(call, activity, firebaseAuth, provider);
                        });
                } else {
                    startFirebaseWebOAuthProvider(call, activity, firebaseAuth, provider);
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to initialize Firebase web OAuth Sign-In", e);
                handleWebOAuthFailure(call, e);
            }
        });
    }

    private void startFirebaseWebOAuthProvider(
        final PluginCall call,
        final Activity activity,
        final FirebaseAuth firebaseAuth,
        final OAuthProvider provider
    ) {
        if (activity == null || activity.isFinishing()) {
            call.reject("Activity context is not available.");
            return;
        }

        Log.i(TAG, "Launching Firebase web-based Google OAuth fallback (startActivityForSignInWithProvider).");
        // Intentionally use non-Activity-scoped listeners because MainActivity enters onStop()
        // while the browser / Custom Tab is open, which would detach Activity-scoped Task listeners.
        firebaseAuth
            .startActivityForSignInWithProvider(activity, provider)
            .addOnSuccessListener(authResult -> {
                Log.i(TAG, "Firebase web OAuth Sign-In succeeded.");
                handleAuthenticatedAuthResult(call, authResult, null, null, null, null, "firebase_web_oauth");
            })
            .addOnFailureListener(exception -> {
                Log.e(TAG, "Firebase web OAuth Sign-In failed: " + exception.getMessage(), exception);
                handleWebOAuthFailure(call, exception);
            });
    }

    private void handleWebOAuthFailure(final PluginCall call, @Nullable final Exception exception) {
        if (exception == null) {
            call.reject("Google Sign-In via browser failed. Please try again.");
            return;
        }

        String rawMessage = exception.getMessage() != null ? exception.getMessage() : "";
        String lowerMsg = rawMessage.toLowerCase(Locale.ROOT);
        String errorCode = "";
        if (exception instanceof FirebaseAuthException) {
            String code = ((FirebaseAuthException) exception).getErrorCode();
            if (code != null) {
                errorCode = code.toUpperCase(Locale.ROOT);
            }
        }

        boolean isCancellation =
            errorCode.contains("WEB_CONTEXT_CANCELED")
                || errorCode.equals("ERROR_CANCELED")
                || lowerMsg.contains("web operation was canceled")
                || lowerMsg.contains("canceled by the user")
                || lowerMsg.contains("cancelled by the user")
                || lowerMsg.contains("user has canceled")
                || lowerMsg.contains("user cancelled")
                || lowerMsg.contains("dismissed");

        if (isCancellation) {
            Log.w(TAG, "User cancelled Firebase web OAuth Sign-In (" + errorCode + ").");
            call.reject("Google Sign-In was cancelled or dismissed.");
            return;
        }

        if (exception instanceof FirebaseNetworkException
            || lowerMsg.contains("network")
            || lowerMsg.contains("unable to resolve host")
            || lowerMsg.contains("timeout")
            || lowerMsg.contains("connection")) {
            call.reject("Network error during Google Sign-In. Please check your internet connection and try again.");
            return;
        }

        if (exception instanceof ActivityNotFoundException
            || lowerMsg.contains("no browser")
            || lowerMsg.contains("activity not found")
            || lowerMsg.contains("unable to find explicit activity")
            || lowerMsg.contains("unable to launch")) {
            call.reject("No compatible web browser was found to complete Google Sign-In. Please enable a browser and try again.");
            return;
        }

        if (errorCode.contains("WEB_CONTEXT_ALREADY_PRESENTED")
            || lowerMsg.contains("already presented")
            || lowerMsg.contains("pending operation")) {
            call.reject("A Google Sign-In window is already open. Please finish or close it and try again.");
            return;
        }

        if (errorCode.contains("WEB_STORAGE_UNSUPPORTED")
            || errorCode.contains("WEB_INTERNAL_ERROR")
            || exception instanceof FirebaseAuthWebException) {
            call.reject("Browser sign-in could not complete. Make sure cookies and JavaScript are enabled in your browser and try again.");
            return;
        }

        if (errorCode.contains("OPERATION_NOT_ALLOWED")) {
            call.reject("Google Sign-In is currently unavailable for this app. Please contact support.");
            return;
        }

        if (errorCode.contains("USER_DISABLED")) {
            call.reject("This account has been disabled. Please contact support.");
            return;
        }

        if (errorCode.contains("ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL")) {
            call.reject("An account already exists with this email using a different sign-in method.");
            return;
        }

        String detail = !rawMessage.isEmpty() ? rawMessage : exception.getClass().getSimpleName();
        call.reject("Google Sign-In via browser failed: " + detail);
    }

    private void handleSuccessfulGoogleSignIn(
        final PluginCall call, 
        final String idToken, 
        final String email, 
        final String displayName, 
        final String photoUrl
    ) {
        try {
            FirebaseAuth firebaseAuth = FirebaseAuth.getInstance();
            AuthCredential credential = GoogleAuthProvider.getCredential(idToken, null);

            firebaseAuth.signInWithCredential(credential).addOnCompleteListener(authTask -> {
                if (authTask.isSuccessful() && authTask.getResult() != null) {
                    handleAuthenticatedAuthResult(
                        call,
                        authTask.getResult(),
                        idToken,
                        email,
                        displayName,
                        photoUrl,
                        "native_gms"
                    );
                } else {
                    Exception authEx = authTask.getException();
                    Log.w(TAG, "Native Firebase signInWithCredential note (ID token valid for JS SDK): " + (authEx != null ? authEx.getMessage() : "unknown"));
                    JSObject ret = new JSObject();
                    ret.put("idToken", idToken != null ? idToken : "");
                    ret.put("email", email != null ? email : "");
                    ret.put("displayName", displayName != null ? displayName : "");
                    ret.put("photoUrl", photoUrl != null ? photoUrl : "");
                    ret.put("authFlow", "native_gms");
                    call.resolve(ret);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error in handleSuccessfulGoogleSignIn", e);
            // Fallback: return the idToken so web JS SDK can still complete sign-in
            JSObject ret = new JSObject();
            ret.put("idToken", idToken != null ? idToken : "");
            ret.put("email", email != null ? email : "");
            ret.put("displayName", displayName != null ? displayName : "");
            ret.put("photoUrl", photoUrl != null ? photoUrl : "");
            ret.put("authFlow", "native_gms");
            call.resolve(ret);
        }
    }

    /**
     * Shared post-login success handler used by both GMS native Google Sign-In and
     * Firebase web OAuth (non-GMS / Huawei) so both paths extract identical FirebaseUser
     * metadata and tokens and enter the exact same session and MySQL sync pipeline.
     */
    private void handleAuthenticatedAuthResult(
        final PluginCall call,
        @Nullable final AuthResult authResult,
        @Nullable final String fallbackIdToken,
        @Nullable final String fallbackEmail,
        @Nullable final String fallbackDisplayName,
        @Nullable final String fallbackPhotoUrl,
        final String authFlow
    ) {
        FirebaseUser user = (authResult != null && authResult.getUser() != null)
            ? authResult.getUser()
            : FirebaseAuth.getInstance().getCurrentUser();

        String oauthIdToken = fallbackIdToken;
        String oauthAccessToken = null;
        if (authResult != null && authResult.getCredential() instanceof OAuthCredential) {
            OAuthCredential oauthCredential = (OAuthCredential) authResult.getCredential();
            if ((oauthIdToken == null || oauthIdToken.isEmpty())
                && oauthCredential.getIdToken() != null
                && !oauthCredential.getIdToken().isEmpty()) {
                oauthIdToken = oauthCredential.getIdToken();
            }
            if (oauthCredential.getAccessToken() != null && !oauthCredential.getAccessToken().isEmpty()) {
                oauthAccessToken = oauthCredential.getAccessToken();
            }
        }

        String resolvedUid = user != null ? user.getUid() : "";
        String resolvedEmail = firstNonEmpty(
            user != null ? user.getEmail() : null,
            extractProviderField(user, "email"),
            fallbackEmail
        );
        String resolvedDisplayName = firstNonEmpty(
            user != null ? user.getDisplayName() : null,
            extractProviderField(user, "displayName"),
            fallbackDisplayName
        );
        String resolvedPhotoUrl = firstNonEmpty(
            (user != null && user.getPhotoUrl() != null) ? user.getPhotoUrl().toString() : null,
            extractProviderField(user, "photoUrl"),
            fallbackPhotoUrl
        );

        final String finalIdToken = oauthIdToken != null ? oauthIdToken : "";
        final String finalAccessToken = oauthAccessToken;
        final String finalUid = resolvedUid != null ? resolvedUid : "";
        final String finalEmail = resolvedEmail != null ? resolvedEmail : "";
        final String finalDisplayName = resolvedDisplayName != null ? resolvedDisplayName : "";
        final String finalPhotoUrl = resolvedPhotoUrl != null ? resolvedPhotoUrl : "";

        if (user == null && finalIdToken.isEmpty() && (finalAccessToken == null || finalAccessToken.isEmpty())) {
            Log.e(TAG, "Authenticated AuthResult contained neither FirebaseUser nor OAuth credential.");
            call.reject("Google Sign-In completed without valid account data. Please try again.");
            return;
        }

        if (user != null) {
            Log.i(TAG, "Native Firebase Auth sign-in successful (" + authFlow + "). UID: " + finalUid);
            user.getIdToken(false).addOnCompleteListener(tokenTask -> {
                String firebaseIdToken = null;
                if (tokenTask.isSuccessful() && tokenTask.getResult() != null) {
                    firebaseIdToken = tokenTask.getResult().getToken();
                } else if (tokenTask.getException() != null) {
                    Log.w(TAG, "Firebase getIdToken note after sign-in: " + tokenTask.getException().getMessage());
                }
                resolveAuthenticatedPayload(
                    call,
                    finalIdToken,
                    finalAccessToken,
                    firebaseIdToken,
                    finalUid,
                    finalEmail,
                    finalDisplayName,
                    finalPhotoUrl,
                    authFlow
                );
            });
        } else {
            resolveAuthenticatedPayload(
                call,
                finalIdToken,
                finalAccessToken,
                null,
                finalUid,
                finalEmail,
                finalDisplayName,
                finalPhotoUrl,
                authFlow
            );
        }
    }

    private void resolveAuthenticatedPayload(
        final PluginCall call,
        final String idToken,
        @Nullable final String accessToken,
        @Nullable final String firebaseIdToken,
        final String uid,
        final String email,
        final String displayName,
        final String photoUrl,
        final String authFlow
    ) {
        JSObject ret = new JSObject();
        ret.put("idToken", idToken != null ? idToken : "");
        if (accessToken != null && !accessToken.isEmpty()) {
            ret.put("accessToken", accessToken);
        }
        if (firebaseIdToken != null && !firebaseIdToken.isEmpty()) {
            ret.put("firebaseIdToken", firebaseIdToken);
        }
        if (uid != null && !uid.isEmpty()) {
            ret.put("uid", uid);
        }
        ret.put("email", email != null ? email : "");
        ret.put("displayName", displayName != null ? displayName : "");
        ret.put("photoUrl", photoUrl != null ? photoUrl : "");
        ret.put("authFlow", authFlow != null ? authFlow : "native_gms");
        call.resolve(ret);
    }

    @Nullable
    private String extractProviderField(@Nullable FirebaseUser user, final String field) {
        if (user == null || user.getProviderData() == null) {
            return null;
        }
        for (UserInfo info : user.getProviderData()) {
            if (info == null) continue;
            if ("email".equals(field) && info.getEmail() != null && !info.getEmail().isEmpty()) {
                return info.getEmail();
            }
            if ("displayName".equals(field) && info.getDisplayName() != null && !info.getDisplayName().isEmpty()) {
                return info.getDisplayName();
            }
            if ("photoUrl".equals(field) && info.getPhotoUrl() != null) {
                String url = info.getPhotoUrl().toString();
                if (!url.isEmpty()) {
                    return url;
                }
            }
        }
        return null;
    }

    @Nullable
    private String firstNonEmpty(@Nullable String... values) {
        if (values == null) return null;
        for (String val : values) {
            if (val != null && !val.trim().isEmpty()) {
                return val.trim();
            }
        }
        return null;
    }

    @PluginMethod
    public void signOut(final PluginCall call) {
        Activity activity = getActivity();

        try {
            boolean gmsAvailable = isGooglePlayServicesAvailable(activity);

            // 1. Clear CredentialManager state (only when GMS is available)
            if (activity != null && gmsAvailable) {
                try {
                    ClearCredentialStateRequest request = new ClearCredentialStateRequest();
                    CredentialManager credentialManager = CredentialManager.create(activity);
                    credentialManager.clearCredentialStateAsync(
                        request,
                        null,
                        CREDENTIAL_EXECUTOR,
                        new CredentialManagerCallback<Void, ClearCredentialException>() {
                            @Override public void onResult(Void result) {}
                            @Override public void onError(@NonNull ClearCredentialException e) {}
                        }
                    );
                } catch (Throwable ignored) {}
            }

            // 2. Sign out legacy GoogleSignInClient (only when GMS is available)
            if (activity != null && gmsAvailable) {
                try {
                    String serverClientId = getServerClientId(call);
                    GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                        .requestIdToken(serverClientId)
                        .requestEmail()
                        .build();
                    GoogleSignIn.getClient(activity, gso).signOut();
                } catch (Throwable ignored) {}
            }

            // 3. Sign out native FirebaseAuth (works for both GMS and web OAuth sessions)
            try {
                FirebaseAuth.getInstance().signOut();
            } catch (Throwable ignored) {}

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.w(TAG, "Native Google signOut note: " + e.getMessage());
            JSObject ret = new JSObject();
            ret.put("success", false);
            call.resolve(ret);
        }
    }
}
