/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SnugFitBridge.kt  –  Android Native Module für React Native
 * ─────────────────────────────────────────────────────────────────────────────
 * Verbindet das React Native JavaScript-Layer mit dem nativen SnugFit SDK.
 *
 * Setup:
 *   1. snugfit-sdk-3.x.aar in android/app/libs/ kopieren
 *   2. build.gradle: implementation(files('libs/snugfit-sdk-3.x.aar'))
 *   3. Berechtigungen in AndroidManifest.xml:
 *      <uses-permission android:name="android.permission.CAMERA"/>
 *      <uses-feature android:name="android.hardware.camera.ar" android:required="false"/>
 *
 * Benötigt Android 9+ (API 28), empfohlen Android 11+ für ToF-Support
 * ─────────────────────────────────────────────────────────────────────────────
 */

package com.atelier.snugfit

import android.app.Activity
import android.view.ViewGroup
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.snugfit.sdk.*          // ← offizielles SnugFit Package (Pseudocode)
import com.snugfit.sdk.ar.*
import com.snugfit.sdk.mesh.*
import com.snugfit.sdk.export.*

class SnugFitBridge(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext), SnugFitEventListener {

  // ── Interne Zustandsvariablen ──────────────────────────────────────────────
  private val activeSessions = mutableMapOf<String, SFScanSession>()
  private val arControllers  = mutableMapOf<String, SFARController>()

  override fun getName() = "SnugFitSDK"

  // ─────────────────────────────────────────────────────────────────────────
  // SDK Initialisierung
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initialisiert das SnugFit SDK.
   * PSEUDOCODE: SnugFitManager ist der zentrale SDK-Einstiegspunkt.
   */
  @ReactMethod
  fun initialize(config: ReadableMap, promise: Promise) {
    try {
      // PSEUDOCODE ─ SDK-Konfiguration
      val sdkConfig = SFConfiguration.Builder()
        .apiKey(config.getString("apiKey") ?: "")
        .environment(
          if (config.getString("environment") == "sandbox")
            SFEnvironment.SANDBOX else SFEnvironment.PRODUCTION
        )
        .resolution(parseResolution(config.getString("resolution")))
        .meshModel(config.getString("meshModel") ?: "foot_v3")
        .enableARCore(config.getBoolean("enableARMode") ?: true)
        .enableToF(config.getBoolean("enableLiDAR") ?: true)
        .build()

      // PSEUDOCODE ─ SDK initialisieren
      SnugFitManager.getInstance().configure(reactContext, sdkConfig)
      SnugFitManager.getInstance().addEventListener(this)

      val resultMap = Arguments.createMap().apply {
        putString("version",  SnugFitManager.getInstance().sdkVersion)
        putBoolean("toFAvailable", SFDeviceCapabilities.hasToFSensor(reactContext))
        putString("status",   "initialized")
      }
      promise.resolve(resultMap)

    } catch (e: Exception) {
      promise.reject("SF_INIT_ERROR", "SDK-Initialisierung fehlgeschlagen: ${e.message}", e)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Session Management
  // ─────────────────────────────────────────────────────────────────────────

  @ReactMethod
  fun createScanSession(options: ReadableMap, promise: Promise) {
    val footSideStr = options.getString("footSide") ?: run {
      promise.reject("SF_INVALID_PARAMS", "footSide erforderlich")
      return
    }

    val footSide = when (footSideStr) {
      "LEFT"  -> SFFootSide.LEFT
      "RIGHT" -> SFFootSide.RIGHT
      else    -> { promise.reject("SF_INVALID_PARAMS", "Ungültige footSide: $footSideStr"); return }
    }

    // PSEUDOCODE ─ Session-Optionen konfigurieren
    val sessionOptions = SFSessionOptions.Builder()
      .footSide(footSide)
      .captureTimeout(options.getDouble("captureTimeout").toLong().coerceAtLeast(10L))
      .minQuality(options.getDouble("minQuality").toFloat().coerceIn(0f, 100f))
      .mode(if (options.getString("mode") == "freeform") SFScanMode.FREEFORM else SFScanMode.GUIDED)
      .build()

    val session   = SnugFitManager.getInstance().createSession(sessionOptions)
    val sessionId = session.sessionId

    activeSessions[sessionId] = session

    val resultMap = Arguments.createMap().apply {
      putString("sessionId", sessionId)
    }
    promise.resolve(resultMap)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AR-Kamera-Preview
  // ─────────────────────────────────────────────────────────────────────────

  @ReactMethod
  fun startARPreview(options: ReadableMap, promise: Promise) {
    val sessionId  = options.getString("sessionId") ?: run {
      promise.reject("SF_PREVIEW_ERROR", "sessionId fehlt")
      return
    }
    val session    = activeSessions[sessionId] ?: run {
      promise.reject("SF_PREVIEW_ERROR", "Session nicht gefunden")
      return
    }
    val viewHandle = options.getInt("viewHandle")

    reactContext.runOnUiQueueThread {
      // PSEUDOCODE ─ Native View aus React Native UIManager holen
      val uiManager  = reactContext.getNativeModule(UIManagerModule::class.java)
      val targetView = uiManager?.resolveView(viewHandle) as? ViewGroup ?: run {
        promise.reject("SF_PREVIEW_ERROR", "View nicht gefunden")
        return@runOnUiQueueThread
      }

      // PSEUDOCODE ─ AR-Controller erstellen
      val arConfig = SFARConfig.Builder()
        .showDepthMap(options.getBoolean("showDepthMap") ?: true)
        .showSkeleton(options.getBoolean("showSkeleton") ?: true)
        .overlayColor(0xFF10B981.toInt())   // Grün
        .build()

      val arController = SnugFitManager.getInstance().createARController(session, arConfig)

      // AR-View in den React Native Container einbetten
      val arView = arController.getView(reactContext)
      val lp     = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
      )
      targetView.addView(arView, lp)

      // Position-Updates weiterleiten
      arController.setPositionUpdateListener { positionData ->
        val eventMap = Arguments.createMap().apply {
          putString("sessionId",  sessionId)
          putString("status",     positionData.statusString)
          putDouble("confidence", positionData.confidence.toDouble())
          putMap("boundingBox", Arguments.createMap().apply {
            putDouble("x",      positionData.boundingBox.left.toDouble())
            putDouble("y",      positionData.boundingBox.top.toDouble())
            putDouble("width",  positionData.boundingBox.width().toDouble())
            putDouble("height", positionData.boundingBox.height().toDouble())
          })
        }
        sendEvent("SnugFitPositionUpdate", eventMap)
      }

      arControllers[sessionId] = arController
      arController.start(currentActivity!!)

      val resultMap = Arguments.createMap().apply {
        putString("status", "ar_preview_started")
      }
      promise.resolve(resultMap)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Winkel-Aufnahme
  // ─────────────────────────────────────────────────────────────────────────

  @ReactMethod
  fun captureAngle(options: ReadableMap, promise: Promise) {
    val sessionId = options.getString("sessionId") ?: run {
      promise.reject("SF_CAPTURE_ERROR", "sessionId fehlt")
      return
    }
    val session  = activeSessions[sessionId] ?: run {
      promise.reject("SF_CAPTURE_ERROR", "Session nicht gefunden")
      return
    }
    val angleId  = options.getString("angleId") ?: "top"

    val captureOptions = SFCaptureOptions.Builder()
      .angleId(angleId)
      .frameCount(options.getInt("frameCount").coerceAtLeast(1))
      .depthResolution(SFDepthResolution.FULL)
      .build()

    // PSEUDOCODE ─ Aufnahme asynchron durchführen
    session.captureAngle(captureOptions, object : SFCaptureCallback {
      override fun onSuccess(result: SFCaptureResult) {
        val resultMap = Arguments.createMap().apply {
          putBoolean("success",  true)
          putDouble("quality",   result.quality.toDouble())
          putString("message",   "Aufnahme erfolgreich")
          putString("previewImageBase64", result.previewImageBase64 ?: "")
        }
        promise.resolve(resultMap)
      }

      override fun onQualityInsufficient(quality: Float, message: String) {
        val resultMap = Arguments.createMap().apply {
          putBoolean("success", false)
          putDouble("quality",  quality.toDouble())
          putString("message",  message)
        }
        promise.resolve(resultMap)   // resolve (kein reject) – UI handelt den Retry
      }

      override fun onError(error: SFException) {
        promise.reject("SF_CAPTURE_ERROR", error.message, error)
      }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mesh-Verarbeitung
  // ─────────────────────────────────────────────────────────────────────────

  @ReactMethod
  fun processMesh(options: ReadableMap, promise: Promise) {
    val sessionId = options.getString("sessionId") ?: run {
      promise.reject("SF_MESH_ERROR", "sessionId fehlt")
      return
    }
    val session = activeSessions[sessionId] ?: run {
      promise.reject("SF_MESH_ERROR", "Session nicht gefunden")
      return
    }

    val meshOptions = SFMeshOptions.Builder()
      .targetTriangles(options.getInt("targetTriangles").coerceAtLeast(1_000))
      .smoothing(options.getDouble("smoothing").toFloat().coerceIn(0f, 1f))
      .fillHoles(options.getBoolean("fillHoles") ?: true)
      .coordinateSystem(SFCoordinateSystem.FOOT_STANDARD)
      .build()

    session.processMesh(meshOptions,
      progressCallback = { percentage ->
        val progressMap = Arguments.createMap().apply {
          putString("sessionId",  sessionId)
          putInt("percentage",    percentage)
        }
        sendEvent("SnugFitMeshProgress", progressMap)
      },
      callback = object : SFMeshCallback {
        override fun onSuccess(result: SFMeshResult) {
          val measurementsMap = Arguments.createMap().apply {
            putDouble("length",       result.measurements.length.toDouble())
            putDouble("width",        result.measurements.width.toDouble())
            putDouble("heelWidth",    result.measurements.heelWidth.toDouble())
            putDouble("instepHeight", result.measurements.instepHeight.toDouble())
            putDouble("archHeight",   result.measurements.archHeight.toDouble())
            putDouble("ballGirth",    result.measurements.ballGirth.toDouble())
          }
          val resultMap = Arguments.createMap().apply {
            putDouble("accuracy",     result.accuracy.toDouble())
            putString("meshId",       result.meshId)
            putMap("measurements",    measurementsMap)
          }
          promise.resolve(resultMap)
        }

        override fun onError(error: SFException) {
          promise.reject("SF_MESH_ERROR", "Mesh-Verarbeitung fehlgeschlagen: ${error.message}", error)
        }
      }
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STL-Export
  // ─────────────────────────────────────────────────────────────────────────

  @ReactMethod
  fun exportSTL(options: ReadableMap, promise: Promise) {
    val sessionId  = options.getString("sessionId")  ?: run {
      promise.reject("SF_EXPORT_ERROR", "sessionId fehlt"); return
    }
    val session    = activeSessions[sessionId] ?: run {
      promise.reject("SF_EXPORT_ERROR", "Session nicht gefunden"); return
    }
    val outputPath = options.getString("outputPath") ?: run {
      promise.reject("SF_EXPORT_ERROR", "outputPath fehlt"); return
    }

    val exportOptions = SFSTLExportOptions.Builder()
      .outputPath(outputPath)
      .format(if (options.getString("format") == "ascii") SFSTLFormat.ASCII else SFSTLFormat.BINARY)
      .unit(SFUnit.MILLIMETERS)
      .scale(options.getDouble("scale").toFloat())
      .build()

    session.exportSTL(exportOptions, object : SFExportCallback {
      override fun onSuccess(result: SFSTLResult) {
        val resultMap = Arguments.createMap().apply {
          putString("path",           result.path)
          putInt("fileSize",          result.fileSize.toInt())
          putInt("triangleCount",     result.triangleCount)
          putBoolean("isWatertight",  result.isWatertight)
          putString("checksum",       result.sha256Checksum)
        }
        promise.resolve(resultMap)
      }

      override fun onError(error: SFException) {
        promise.reject("SF_EXPORT_ERROR", "STL-Export fehlgeschlagen: ${error.message}", error)
      }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Session beenden
  // ─────────────────────────────────────────────────────────────────────────

  @ReactMethod
  fun endSession(sessionId: String, promise: Promise) {
    reactContext.runOnUiQueueThread {
      activeSessions[sessionId]?.cancel()
      activeSessions.remove(sessionId)

      arControllers[sessionId]?.let { arVC ->
        arVC.stop()
        arVC.getView(reactContext).also { view ->
          (view.parent as? ViewGroup)?.removeView(view)
        }
      }
      arControllers.remove(sessionId)

      val result = Arguments.createMap().apply { putString("status", "ended") }
      promise.resolve(result)
    }
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun getVersion(): String = SnugFitManager.getInstance().sdkVersion

  // ─────────────────────────────────────────────────────────────────────────
  // Event-Helper
  // ─────────────────────────────────────────────────────────────────────────

  private fun sendEvent(eventName: String, params: WritableMap) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  private fun parseResolution(value: String?): SFScanResolution = when (value) {
    "ultra"    -> SFScanResolution.ULTRA
    "standard" -> SFScanResolution.STANDARD
    else       -> SFScanResolution.HIGH
  }
}
