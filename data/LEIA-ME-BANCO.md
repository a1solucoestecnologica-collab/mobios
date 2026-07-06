# Banco de dados MOBI OS

O arquivo `moble-tools.sqlite` contém **todos os dados** do sistema: ferramentas, fotos, listas, usuários, histórico.

## Antes de empacotar para a VM

1. **Pare o servidor** (`Ctrl+C` ou `systemctl stop moble-tools`)
2. **Substitua** este arquivo pelo banco real de produção se necessário
3. O arquivo deve ser um SQLite válido — **não** um ponteiro Git LFS

### Como identificar ponteiro LFS (inválido)

Se ao abrir o arquivo em um editor de texto aparecer:

```
version https://git-lfs.github.com/spec/v1
```

Esse não é o banco. Baixe o real com `git lfs pull` ou copie de outra máquina.

### Validar e preparar

```powershell
node scripts/prepare-database.js
```

Isso faz checkpoint do WAL e mostra contagem de registros.

## Na VM

O instalador (`install/linux/install.sh` ou `install/windows/install.ps1`) copia o banco do pacote e **preserva** um banco já existente, a menos que use `--force-db` (Linux) ou `-ForceDb` (Windows).
