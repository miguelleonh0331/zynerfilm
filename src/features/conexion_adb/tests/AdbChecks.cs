using Zynerfilmer.Conexion.Services;
namespace Zynerfilmer.Conexion.Tests;
internal static class AdbChecks
{
    public static void Run()
    {
        var adb = new AdbService("unused");
        if (adb.Endpoint(" 192.168.1.20:5555 ") != "192.168.1.20:5555" || adb.Endpoint("[::1]:5555") != "[::1]:5555") throw new Exception("Endpoint normalization");
        foreach (var value in new[] { "192.168.1.20:0", "192.168.1.20:65536", "x:5555", "192.168.1.20:5555 & calc" })
        {
            bool rejected = false;
            try { adb.Endpoint(value); } catch (IOException) { rejected = true; }
            if (!rejected) throw new Exception("Invalid endpoint accepted");
        }
        var devices = AdbService.ParseDevices("List of devices attached\n192.168.1.20:5555 device model:Galaxy_S10\nusb unauthorized\nnet offline\n");
        if (devices.Length != 3 || devices[0].Model != "Galaxy S10" || devices[1].State != "unauthorized" || devices[2].State != "offline") throw new Exception("ADB states");
    }
}
