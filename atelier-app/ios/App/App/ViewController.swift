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

    override func viewDidLoad() {
        // CAPBridgeViewController.loadView() sets self.view = webView directly.
        // We must wrap the webView in a container so ARSCNView can be inserted BEHIND it.
        let webView = self.view!  // This IS the WKWebView (set by loadView())

        let container = UIView(frame: webView.bounds)
        container.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        container.backgroundColor = .clear

        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        container.addSubview(webView)

        // Replace VC's root view with the container (before UIKit adds it to window)
        self.view = container

        super.viewDidLoad()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Force webview transparency after Capacitor fully initialized
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
    }
}
