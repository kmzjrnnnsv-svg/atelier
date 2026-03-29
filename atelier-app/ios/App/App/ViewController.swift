import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        print("[LiDAR] capacitorDidLoad – registering LidarScanPlugin via instance")
        let plugin = LidarScanPlugin()
        bridge?.registerPluginInstance(plugin)
        // Verify registration
        let registered = bridge?.plugin(withName: "LidarScan")
        print("[LiDAR] Registration result: \(registered != nil ? "SUCCESS" : "FAILED")")
        print("[LiDAR] Registered plugin jsName: \(registered?.pluginId ?? "nil")")
    }

    // Set webview transparent AFTER Capacitor has fully initialized
    // (viewDidLoad is too early — Capacitor overrides backgroundColor)
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
    }
}
