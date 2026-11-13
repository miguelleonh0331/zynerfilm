namespace Zynerfilmer;
internal static class SelfChecks
{
    public static async Task Run()
    {
        Conexion.Tests.AdbChecks.Run();
        await Equipos.Tests.EquipmentChecks.Run();
        await Sesiones.Tests.SessionChecks.Run();
    }
}
