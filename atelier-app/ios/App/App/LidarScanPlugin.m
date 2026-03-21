#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(LidarScanPlugin, "LidarScan",
  CAP_PLUGIN_METHOD(captureFootScan,                CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(isLidarSupported,               CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(startWalkAround,                CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(getWalkAroundProgress,          CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(finishWalkAround,               CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(startContinuousCapture,         CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(getContinuousCaptureProgress,   CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(finishContinuousCapture,        CAPPluginReturnPromise);
)
