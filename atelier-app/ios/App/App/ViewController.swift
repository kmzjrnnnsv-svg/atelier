import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        print("[LiDAR] capacitorDidLoad – registering LidarScanPlugin")
        bridge?.registerPluginType(LidarScanPlugin.self)
        print("[LiDAR] LidarScanPlugin registered successfully")
    }
}
