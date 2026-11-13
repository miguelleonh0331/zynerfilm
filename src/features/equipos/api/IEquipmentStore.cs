namespace Zynerfilmer.Equipos.Api;
public interface IEquipmentStore
{
    Task<string[]> Load(CancellationToken cancellation);
    Task Save(IEnumerable<string> endpoints, CancellationToken cancellation);
}
