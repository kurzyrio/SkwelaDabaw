package com.kurzyrio.skweladabaw;

import android.app.Activity;
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
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.tasks.Task;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;

import java.util.concurrent.Executor;
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

    @PluginMethod
    public void signIn(final PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            Log.e(TAG, "Cannot initiate Google Sign-In: Activity is null or finishing.");
            call.reject("Activity context is not available.");
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
                Executor executor = Executors.newSingleThreadExecutor();

                credentialManager.getCredentialAsync(
                    activity,
                    request,
                    null,
                    executor,
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

                            if (exception instanceof NoCredentialException) {
                                Log.w(TAG, "NoCredentialException received: " + exception.getMessage() + ". Launching legacy GoogleSignInClient fallback for Xiaomi / MIUI / HyperOS.");
                            } else {
                                Log.e(TAG, "GetCredentialException (" + exception.getClass().getSimpleName() + "): " + exception.getMessage() + ". Launching legacy GoogleSignInClient fallback.", exception);
                            }

                            // Launch fallback on UI thread
                            activity.runOnUiThread(() -> launchLegacyGoogleSignIn(call, serverClientId));
                        }
                    }
                );
            } catch (Exception e) {
                Log.e(TAG, "Exception during CredentialManager initialization: " + e.getMessage() + ". Launching legacy fallback.", e);
                activity.runOnUiThread(() -> launchLegacyGoogleSignIn(call, serverClientId));
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
                try {
                    Intent signInIntent = client.getSignInIntent();
                    startActivityForResult(call, signInIntent, "handleLegacyGoogleSignInResult");
                } catch (Exception launchEx) {
                    Log.e(TAG, "Failed to launch legacy Google Sign-In intent", launchEx);
                    call.reject("Failed to open Google account picker: " + launchEx.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error configuring legacy GoogleSignInClient", e);
            call.reject("Google Sign-In configuration error: " + e.getMessage());
        }
    }

    @ActivityCallback
    public void handleLegacyGoogleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        int resultCode = result.getResultCode();
        Intent data = result.getData();

        if (resultCode != Activity.RESULT_OK || data == null) {
            Log.w(TAG, "Legacy Google Sign-In was cancelled or dismissed by user (resultCode=" + resultCode + ")");
            call.reject("Google Sign-In was cancelled or dismissed.");
            return;
        }

        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
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

            if (statusCode == CommonStatusCodes.DEVELOPER_ERROR) {
                // Code 10: Missing SHA-1 fingerprint in Firebase Console
                Log.e(TAG, "CRITICAL: Developer Error (status code 10). The app signing SHA-1 fingerprint must be registered in the Firebase Console under Project Settings -> Android Apps!");
                call.reject("Google Sign-In configuration error (Code 10: Developer Error). Please verify SHA-1 fingerprint in Firebase Console.");
            } else if (statusCode == GoogleSignInStatusCodes.SIGN_IN_FAILED) {
                // Code 12500: General sign-in failed
                Log.e(TAG, "CRITICAL: Sign-In Failed (status code 12500). Verify Google Play Services, device clock, and Firebase SHA-1 / SHA-256 fingerprints.");
                call.reject("Google Sign-In failed (Code 12500). Please check network and Google Play Services.");
            } else if (statusCode == GoogleSignInStatusCodes.SIGN_IN_CANCELLED || statusCode == CommonStatusCodes.CANCELED) {
                call.reject("Google Sign-In was cancelled or dismissed.");
            } else if (statusCode == CommonStatusCodes.NETWORK_ERROR) {
                call.reject("Network error during Google Sign-In. Please check your internet connection.");
            } else {
                call.reject("Google Sign-In error (Code " + statusCode + "): " + e.getMessage());
            }
        } catch (Exception ex) {
            Log.e(TAG, "Unexpected error in legacy Google Sign-In result handling", ex);
            call.reject("Google Sign-In unexpected error: " + ex.getMessage());
        }
    }

    private void handleSuccessfulGoogleSignIn(
        final PluginCall call, 
        final String idToken, 
        final String email, 
        final String displayName, 
        final String photoUrl
    ) {
        Activity activity = getActivity();

        try {
            FirebaseAuth firebaseAuth = FirebaseAuth.getInstance();
            AuthCredential credential = GoogleAuthProvider.getCredential(idToken, null);

            if (activity != null) {
                firebaseAuth.signInWithCredential(credential).addOnCompleteListener(activity, authTask -> {
                    JSObject ret = new JSObject();
                    ret.put("idToken", idToken);
                    ret.put("email", email != null ? email : "");
                    ret.put("displayName", displayName != null ? displayName : "");
                    ret.put("photoUrl", photoUrl != null ? photoUrl : "");

                    if (authTask.isSuccessful() && firebaseAuth.getCurrentUser() != null) {
                        FirebaseUser user = firebaseAuth.getCurrentUser();
                        ret.put("uid", user.getUid());
                        if (user.getEmail() != null && !user.getEmail().isEmpty()) ret.put("email", user.getEmail());
                        if (user.getDisplayName() != null && !user.getDisplayName().isEmpty()) ret.put("displayName", user.getDisplayName());
                        if (user.getPhotoUrl() != null) ret.put("photoUrl", user.getPhotoUrl().toString());
                        Log.i(TAG, "Native Firebase Auth sign-in successful. UID: " + user.getUid());
                    } else {
                        Exception authEx = authTask.getException();
                        Log.w(TAG, "Native Firebase signInWithCredential note (ID token valid for JS SDK): " + (authEx != null ? authEx.getMessage() : "unknown"));
                    }
                    call.resolve(ret);
                });
            } else {
                JSObject ret = new JSObject();
                ret.put("idToken", idToken);
                ret.put("email", email != null ? email : "");
                ret.put("displayName", displayName != null ? displayName : "");
                ret.put("photoUrl", photoUrl != null ? photoUrl : "");
                call.resolve(ret);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in handleSuccessfulGoogleSignIn", e);
            // Fallback: return the idToken so web JS SDK can still complete sign-in
            JSObject ret = new JSObject();
            ret.put("idToken", idToken);
            ret.put("email", email != null ? email : "");
            ret.put("displayName", displayName != null ? displayName : "");
            ret.put("photoUrl", photoUrl != null ? photoUrl : "");
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void signOut(final PluginCall call) {
        Activity activity = getActivity();

        try {
            // 1. Clear CredentialManager state
            if (activity != null) {
                try {
                    ClearCredentialStateRequest request = new ClearCredentialStateRequest();
                    CredentialManager credentialManager = CredentialManager.create(activity);
                    credentialManager.clearCredentialStateAsync(
                        request,
                        null,
                        Executors.newSingleThreadExecutor(),
                        new CredentialManagerCallback<Void, ClearCredentialException>() {
                            @Override public void onResult(Void result) {}
                            @Override public void onError(@NonNull ClearCredentialException e) {}
                        }
                    );
                } catch (Exception ignored) {}
            }

            // 2. Sign out legacy GoogleSignInClient
            if (activity != null) {
                try {
                    String serverClientId = getServerClientId(call);
                    GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                        .requestIdToken(serverClientId)
                        .requestEmail()
                        .build();
                    GoogleSignIn.getClient(activity, gso).signOut();
                } catch (Exception ignored) {}
            }

            // 3. Sign out native FirebaseAuth
            try {
                FirebaseAuth.getInstance().signOut();
            } catch (Exception ignored) {}

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
