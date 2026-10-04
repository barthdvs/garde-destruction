# garde-destruction

Plugin pour Claude Code. Il examine, **avant exécution**, chaque commande que Claude veut lancer :

- celle qui **détruit quelque chose** t'est soumise : tu confirmes ou tu refuses ;
- celle qui détruit **trop large**, ou **en sautant sa propre confirmation**, est refusée.

Il ne change rien à ta façon de travailler : tant que rien n'est détruit, tu ne le vois pas.

## Installation

Rien d'autre à installer : le plugin est exécuté par Claude Code lui-même, sous Windows, macOS et Linux.
(Si Python 3 est présent, il sert de second filet pour les versions de Claude Code trop anciennes pour le module intégré.)

**Depuis le dépôt** (mises à jour faciles) :

```
claude plugin marketplace add barthdvs/garde-destruction
claude plugin install garde-destruction@garde-destruction
```

**Ou à partir du dossier** (reçu en .zip, par exemple) : copie le dossier `garde-destruction` dans
`~/.claude/skills/` (sous Windows : `%USERPROFILE%\.claude\skills\`). Il est chargé à la session suivante.

Dans les deux cas, ouvre ensuite une **nouvelle session** Claude Code.

## Vérifier que ça marche

Dans un dossier d'essai, demande à Claude : « lance `git reset --hard` ».
Une demande de confirmation doit apparaître, avec un motif qui commence par `garde-destruction :`.
Si la commande part sans rien demander, le plugin n'est pas actif : vérifie `claude plugin list`,
mets Claude Code à jour, ou installe Python 3.

Pour le banc d'essai complet : `claude plugin test <dossier du plugin>` (module intégré) et
`python3 tests/cas.py` (secours Python, doit finir par `0 échec`). Les deux lisent les mêmes cas ;
aucune commande n'y est exécutée.

## Ce qui te sera demandé

| Outil | Commandes soumises à confirmation |
|---|---|
| Terraform / OpenTofu / Terragrunt | `destroy`, `apply` (il peut détruire ou remplacer), `state rm`, `state push`, `force-unlock`, `workspace delete`, `taint` |
| Google Cloud | `gcloud … delete`, `gcloud … destroy`, `gcloud storage rm`, `remove-iam-policy-binding`, `gsutil rm`, `gsutil rb`, `gsutil rsync -d`, `bq rm` |
| Git | `push --force` et `--force-with-lease`, `push --delete`, `reset --hard`, `clean -f`, `branch -D`, `stash clear` |
| Docker / Podman | `system prune`, `volume rm`, `volume prune`, `container prune`, `image prune -a`, `compose down -v` |
| Kubernetes | `kubectl delete` (message renforcé pour `namespace`, `pv`, `pvc`, `crd`), `helm uninstall`, `flux delete`, `flux uninstall` |
| AWS / Azure | `aws s3 rm`, `aws s3 rb`, `aws s3 sync --delete`, `aws … delete-*` / `terminate-*` (`s3api delete-bucket`, `ec2 terminate-instances`…), `az … delete` |
| Stockage objet et distant | `rclone delete`, `deletefile`, `purge`, `rmdir(s)`, `cleanup`, `rclone sync` (il supprime ce qui manque à la source), `mc rm`, `mc rb`, `mc mirror --remove`, `s3cmd del`/`rm`/`rb`, `s3cmd sync --delete-removed` |
| Sauvegardes | `restic forget` (avec ou sans `--prune`), `restic prune` |
| API web | requête `DELETE` : `curl -X DELETE`, `curl --request DELETE`, `wget --method=DELETE`, `http DELETE …` (HTTPie, xh) |
| Fichiers et disques | `rm -r` sur un dossier large (`.`, `*`, `~/projets`, `/home/moi`, `"$DOSSIER"/`, `.git`), `find … -delete` sur un chemin large, `dd of=/dev/…`, `mkfs`, `wipefs -a`, `zfs destroy`, `zpool destroy`, `lvremove`, `vgremove`, `pvremove` |

Le motif nomme la commande et sa cible, par exemple :
`garde-destruction : « gcloud sql instances delete base-prod » supprime des ressources Google Cloud.`

## Ce qui est refusé

| Situation | Exemples |
|---|---|
| La commande saute sa propre confirmation | `terraform destroy -auto-approve`, `terraform apply -destroy -auto-approve`, `gcloud … delete --quiet`, `bq rm -f` |
| La commande saute sa propre confirmation (Azure) | `az … delete --yes` |
| Elle vise trop large | `gcloud projects delete`, `az group delete`, `kubectl delete ns --all` (de même `pv`, `pvc`, `crd` avec `--all`), `kubectl delete … --all -A`, `rm -rf /`, `rm -rf ~`, `rm -rf /etc`, `rm -rf --no-preserve-root` |
| Elle réécrit ou supprime la branche principale | `git push --force` vers `main` ou `master` (nommée, ou branche courante), `git push --delete main` |

Claude reçoit alors la consigne de ne pas contourner le refus et de te dire ce qui a été refusé.
Si tu veux vraiment l'opération, lance-la toi-même dans ton terminal.

## Ce qui reste permis sans rien demander

- Terraform au quotidien : `init`, `validate`, `fmt`, `plan`, `plan -destroy`, `output`, `state list`, `import`.
- Google Cloud en lecture ou en création : `list`, `describe`, `create`, `deploy`, `storage cp`, `gsutil rsync` sans `-d`.
- Git courant : `push`, `push -u`, `reset --soft`, `clean -n`, `branch -d`, `stash`, `commit`.
- Docker courant : `ps`, `up`, `compose down` sans `-v`, `rm -f <conteneur>`, `image prune -f`, `builder prune`.
- Suppressions ordinaires : `rm fichier`, `rm -rf node_modules`, `rm -rf build/`, `rm -rf /tmp/essai`, `rm -rf "$tmp"`.
- Kubernetes en lecture ou en déploiement : `kubectl get`, `describe`, `logs`, `apply`, `exec`, `kubectl delete --dry-run=…`, `helm list`, `helm upgrade --install`, `flux get`, `flux reconcile`.
- Stockage et sauvegardes : `aws s3 ls`, `aws s3 cp`, `aws s3 sync` sans `--delete`, `rclone copy`, `rclone ls`, `mc cp`, `mc mirror` sans `--remove`, `restic snapshots`, `backup`, `check`.
- Les essais à blanc : `--dry-run`, `--dryrun`, `restic … -n`, `rclone … -n`, `zfs destroy -n`.
- Les autres requêtes web (`curl`, `curl -X POST`, `http GET`…), `zfs list`, `zfs snapshot`, `lvcreate`.
- Arrêter un service ou un conteneur (`systemctl stop`, `docker rm -f`) : rien n'y est perdu, ce n'est pas le rôle de ce garde.

Les commandes sont examinées aussi quand elles sont enveloppées : `sudo …`, `ssh hôte '…'`, `sh -c '…'`,
`docker exec … `, `timeout …`, `if …; then …; fi`, `$( … )`.

## Terraform : détruire proprement

`terraform destroy -auto-approve` est refusé, et sans `-auto-approve` Terraform attend une réponse que
Claude ne peut pas taper. La voie prévue :

```
terraform plan -destroy -out=destruction.tfplan    # libre : tu lis ce qui partirait
terraform apply destruction.tfplan                 # soumis à ta confirmation
```

## Ajouter tes propres règles

Crée `~/.config/garde-destruction/regles.txt`, une expression régulière par ligne (les lignes `#` sont ignorées).
Sans préfixe, la commande reconnue t'est soumise ; avec `refus:`, elle est refusée :

```
# bases de données
(psql|mysql).*\b(DROP|TRUNCATE)\b
refus: dropdb
# tout espace de noms Kubernetes, même seul
refus: kubectl delete (ns|namespace)
```

Chaque règle est comparée à chaque commande simple (`outil argument argument…`, guillemets retirés).
Ces règles s'ajoutent à la liste de base ; elles ne peuvent rien en retirer. Reste sur des expressions
simples (pas de `(?i)` en tête) : elles sont lues par deux moteurs.

## En cas de blocage à tort

Le plugin ne surveille que ce que fait Claude. Si une demande ou un refus est une erreur, fais
l'opération toi-même dans ton terminal : tes commandes à toi ne sont pas contrôlées.

## Limites

- C'est un garde-fou contre la destruction par inadvertance, pas un bac à sable : une commande cachée dans
  un script, un `Makefile` ou un programme (`bash nettoyage.sh`, `python -c "shutil.rmtree(…)"`) n'est pas vue.
- Seules les commandes shell sont examinées. Un outil MCP qui supprime des ressources ne l'est pas.
- La confirmation suit le mode de permission de la session. Sans personne pour répondre (`claude -p`, CI,
  agent en arrière-plan), une commande soumise à confirmation n'est pas exécutée. Dans un mode où ce n'est
  pas toi qui réponds aux demandes de permission (mode automatique), vérifie qui tranche : fais l'essai du
  paragraphe « Vérifier que ça marche ». Les refus, eux, ne dépendent pas du mode.
- Sont couverts Terraform, Google Cloud, AWS (stockage S3 et opérations `delete-*` / `terminate-*`), Azure (`delete`),
  Kubernetes, Helm, Flux, Git, Docker, rclone, MinIO (`mc`), s3cmd, restic, les requêtes HTTP `DELETE`, ZFS, LVM
  et les suppressions de fichiers. Les bases de données (`DROP`, `TRUNCATE`…) ne le sont pas : ajoute-les par tes propres règles.
- Une requête `DELETE` envoyée autrement que par `curl`, `wget` ou HTTPie (script, client d'API) n'est pas vue.
- Le module intégré s'appuie sur une interface de Claude Code encore en accès anticipé : elle peut changer
  d'une version à l'autre. Sur une version qui ne le charge pas, seul le secours Python protège ; sans
  Python non plus, le plugin ne retient rien. D'où la vérification ci-dessus, à refaire après une grosse mise à jour.
- Testé sous Linux. Les règles Windows (PowerShell) sont couvertes par le banc d'essai mais n'ont pas été
  essayées sur un vrai poste Windows : fais la vérification après installation.

## Mettre à jour, désactiver

```
claude plugin marketplace update garde-destruction
claude plugin update garde-destruction@garde-destruction
claude plugin disable garde-destruction@garde-destruction
```

(Installé par copie du dossier : remplace le dossier ; l'identifiant est alors `garde-destruction@skills-dir`.)
