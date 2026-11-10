# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Preserve annotations, signatures, and line numbers for stack traces
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable

# Capacitor JavaScript Bridge & WebKit JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Capacitor Core & Plugin reflections
-keep public class * extends com.getcapacitor.Plugin {
    public *;
}
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.ActivityCallback *;
    @com.getcapacitor.annotation.PermissionCallback *;
}
-keep public class * extends com.getcapacitor.Bridge {
    public *;
}
-keep public class com.getcapacitor.** { *; }

# Keep app-specific custom Capacitor plugins, widgets, receivers, and services
-keep class com.kurzyrio.skweladabaw.NativeGoogleAuthPlugin {
    *;
}
-keepclassmembers class com.kurzyrio.skweladabaw.NativeGoogleAuthPlugin {
    *;
}
-keep public class com.kurzyrio.skweladabaw.** extends com.getcapacitor.Plugin {
    public *;
}
-keep public class com.kurzyrio.skweladabaw.** extends android.app.Service {
    public *;
}
-keep public class com.kurzyrio.skweladabaw.** extends android.content.BroadcastReceiver {
    public *;
}
-keep public class com.kurzyrio.skweladabaw.** extends android.appwidget.AppWidgetProvider {
    public *;
}

# Keep Google Credential Manager & Play Services Identity
-keep class androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
-keep class com.google.android.gms.auth.api.signin.** { *; }

# Keep Firebase Auth & Analytics
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Suppress optional unused third-party auth providers in capacitor-firebase-authentication
-dontwarn com.facebook.**
-dontwarn twitter4j.**
