## Architectuur & Mappenstructuur
Docker infrastructuur achter een treafik reverse proxy.
Alle containers communiceren intern via een gedeeld Docker bridge-netwerk (`proxy-net`). Alleen Traefik opent poorten naar buiten (`80` voor HTTP-verkeer en `8080` voor het Traefik-dashboard).


├── docker-compose.yml          # Hoofdconfiguratie: Traefik v3, proxy-net & includes
├── .env.example                # Voorbeeld van vereiste omgevingsvariabelen
├── .gitignore                  # Sluit .env en runtime-data (service1/..4/) uit
└── stacks/
    ├── mediaspeler.yml     # Volledige media-automatiseringsstack + init-containers
    ├── databasesite.yml           # site gelinkt met een database 
    ├── nextcloud.yml              # nextcloud drive
    ├── vaultwarden.yml            # Password manager 
    └──dashboard.yml               # homepagina met links

-- mediaspeler: mediaspeler met als basis jellyfin met daaraan jellyseer, prowlarr en qbittorrent gekoppeld om te proberen de mogelijkheid om films en series rechtstreeks te downloaden. 
-- databasesite: zelfgeschreven website die gebruikmaakt van postgress om een database te tonen.
-- nextcloud: drive voor bestandsopslag
-- vaultwarden: password manager om deze te bereiken is er een / nodig op het einde van de url

-- info over verdere setup volgt na eigen tests
