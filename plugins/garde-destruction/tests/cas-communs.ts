// Cas communs aux deux moteurs (module TypeScript et secours Python).
// Ce qui suit « export const CAS » est du JSON strict : tests/cas.py le relit tel quel.
// refus : commande refusée ; demande : soumise à confirmation ; passe : ni l'un ni l'autre.
export const CAS = {
 "refus": [
  [
   "Bash",
   "terraform destroy -auto-approve"
  ],
  [
   "Bash",
   "tofu destroy --auto-approve"
  ],
  [
   "Bash",
   "terraform apply -destroy -auto-approve"
  ],
  [
   "Bash",
   "cd infra && terraform destroy -auto-approve"
  ],
  [
   "Bash",
   "TF_CLI_ARGS_destroy=-auto-approve terraform destroy"
  ],
  [
   "Bash",
   "terragrunt run-all destroy --terragrunt-non-interactive"
  ],
  [
   "Bash",
   "terraform -chdir=infra destroy -auto-approve -target=module.base"
  ],
  [
   "Bash",
   "echo ok && (cd infra && terraform destroy -auto-approve)"
  ],
  [
   "Bash",
   "gcloud projects delete mon-projet"
  ],
  [
   "Bash",
   "gcloud compute instances delete vm-1 --zone europe-west1-b --quiet"
  ],
  [
   "Bash",
   "gcloud -q sql instances delete base-prod"
  ],
  [
   "Bash",
   "CLOUDSDK_CORE_DISABLE_PROMPTS=1 gcloud run services delete api"
  ],
  [
   "Bash",
   "gcloud resource-manager folders delete 1234"
  ],
  [
   "Bash",
   "bq rm -r -f mon_jeu"
  ],
  [
   "Bash",
   "rm -rf /"
  ],
  [
   "Bash",
   "rm -rf /*"
  ],
  [
   "Bash",
   "rm -rf ~"
  ],
  [
   "Bash",
   "rm -rf $HOME"
  ],
  [
   "Bash",
   "rm -rf \"$HOME\"/"
  ],
  [
   "Bash",
   "sudo rm -rf /etc"
  ],
  [
   "Bash",
   "rm -rf --no-preserve-root /"
  ],
  [
   "Bash",
   "rm -fr /usr/"
  ],
  [
   "Bash",
   "rm -r -f /var"
  ],
  [
   "Bash",
   "ssh root@serveur 'rm -rf /var'"
  ],
  [
   "Bash",
   "ssh root@serveur rm -rf /home"
  ],
  [
   "Bash",
   "sh -c 'rm -rf ~/'"
  ],
  [
   "Bash",
   "sudo bash -lc 'rm -rf /opt'"
  ],
  [
   "Bash",
   "docker run --rm -v /:/hote alpine chroot /hote rm -rf /share"
  ],
  [
   "Bash",
   "ls /tmp; rm -rf /srv"
  ],
  [
   "Bash",
   "true || rm -rf ~/*"
  ],
  [
   "Bash",
   "git push --force origin main"
  ],
  [
   "Bash",
   "git push -f origin master"
  ],
  [
   "Bash",
   "git push origin +main"
  ],
  [
   "Bash",
   "git push --force-with-lease origin HEAD:main"
  ],
  [
   "Bash",
   "git push origin --delete main"
  ],
  [
   "Bash",
   "git push origin :master"
  ],
  [
   "Bash",
   "git -C /depot push -f origin refs/heads/main"
  ],
  [
   "PowerShell",
   "Remove-Item -Recurse -Force C:\\"
  ],
  [
   "PowerShell",
   "terraform destroy -auto-approve"
  ],
  [
   "PowerShell",
   "rm -r -fo $env:USERPROFILE"
  ],
  [
   "Bash",
   "kubectl delete ns --all"
  ],
  [
   "Bash",
   "kubectl delete pvc --all -n prod"
  ],
  [
   "Bash",
   "kubectl delete crd --all"
  ],
  [
   "Bash",
   "kubectl delete pods --all -A"
  ],
  [
   "Bash",
   "ssh admin@bastion 'kubectl delete pv --all'"
  ],
  [
   "Bash",
   "az group delete --name rg-prod"
  ],
  [
   "Bash",
   "az vm delete -g rg -n vm1 --yes"
  ]
 ],
 "demande": [
  [
   "Bash",
   "terraform destroy"
  ],
  [
   "Bash",
   "terraform destroy -target=aws_instance.web"
  ],
  [
   "Bash",
   "terraform apply"
  ],
  [
   "Bash",
   "terraform apply -auto-approve"
  ],
  [
   "Bash",
   "terraform apply tfplan"
  ],
  [
   "Bash",
   "tofu apply -destroy"
  ],
  [
   "Bash",
   "terraform -chdir=infra apply"
  ],
  [
   "Bash",
   "terraform state rm aws_instance.web"
  ],
  [
   "Bash",
   "terraform force-unlock 1234"
  ],
  [
   "Bash",
   "terraform workspace delete essai"
  ],
  [
   "Bash",
   "terraform taint aws_instance.web"
  ],
  [
   "Bash",
   "terragrunt run-all apply"
  ],
  [
   "Bash",
   "sudo -u deploy terraform apply"
  ],
  [
   "Bash",
   "timeout 600 terraform apply -auto-approve"
  ],
  [
   "Bash",
   "if true; then terraform apply; fi"
  ],
  [
   "Bash",
   "terraform plan -out=tfplan && terraform apply tfplan"
  ],
  [
   "Bash",
   "/usr/local/bin/terraform destroy"
  ],
  [
   "Bash",
   "echo yes | terraform destroy"
  ],
  [
   "Bash",
   "gcloud compute instances delete vm-1 --zone europe-west1-b"
  ],
  [
   "Bash",
   "gcloud sql instances delete base-prod"
  ],
  [
   "Bash",
   "gcloud container clusters delete grappe --region europe-west1"
  ],
  [
   "Bash",
   "gcloud secrets versions destroy 3 --secret=jeton"
  ],
  [
   "Bash",
   "gcloud storage rm -r gs://seau/dossier"
  ],
  [
   "Bash",
   "gcloud --project essai compute disks delete disque-1"
  ],
  [
   "Bash",
   "gcloud projects remove-iam-policy-binding essai --member=user:a@example.com --role=roles/editor"
  ],
  [
   "Bash",
   "gsutil -m rm -r gs://seau/dossier"
  ],
  [
   "Bash",
   "gsutil rb gs://seau"
  ],
  [
   "Bash",
   "gsutil rsync -d -r local gs://seau"
  ],
  [
   "Bash",
   "bq rm -t jeu.table"
  ],
  [
   "Bash",
   "rm -rf ."
  ],
  [
   "Bash",
   "rm -rf *"
  ],
  [
   "Bash",
   "rm -rf ./*"
  ],
  [
   "Bash",
   "rm -rf /home/user"
  ],
  [
   "Bash",
   "rm -rf ~/projets"
  ],
  [
   "Bash",
   "rm -rf \"$DOSSIER\"/"
  ],
  [
   "Bash",
   "rm -rf $DOSSIER/*"
  ],
  [
   "Bash",
   "rm -rf ${DOSSIER}/cache"
  ],
  [
   "Bash",
   "rm -rf .git"
  ],
  [
   "Bash",
   "rm -rf /tmp"
  ],
  [
   "Bash",
   "rm -rf build /var/lib"
  ],
  [
   "Bash",
   "rm -rf -- .."
  ],
  [
   "Bash",
   "find /var/log -name '*.log' -delete"
  ],
  [
   "Bash",
   "dd if=image.img of=/dev/sda bs=4M"
  ],
  [
   "Bash",
   "mkfs.ext4 /dev/sdb1"
  ],
  [
   "Bash",
   "sudo wipefs -a /dev/sdb"
  ],
  [
   "Bash",
   "docker system prune -af"
  ],
  [
   "Bash",
   "docker system prune -f"
  ],
  [
   "Bash",
   "docker volume rm donnees"
  ],
  [
   "Bash",
   "docker volume prune -f"
  ],
  [
   "Bash",
   "docker image prune -a -f"
  ],
  [
   "Bash",
   "docker compose down -v"
  ],
  [
   "Bash",
   "docker-compose down --volumes"
  ],
  [
   "Bash",
   "docker compose -f compose.yaml down -v --remove-orphans"
  ],
  [
   "Bash",
   "ssh -p 2222 user@nas 'cd /srv/pile && docker compose down -v'"
  ],
  [
   "Bash",
   "/opt/outils/bin/docker volume rm donnees"
  ],
  [
   "Bash",
   "podman system prune"
  ],
  [
   "Bash",
   "git push --force origin fonctionnalite"
  ],
  [
   "Bash",
   "git push -f"
  ],
  [
   "Bash",
   "git push --force-with-lease"
  ],
  [
   "Bash",
   "git push origin --delete fonctionnalite"
  ],
  [
   "Bash",
   "git push origin :ancienne"
  ],
  [
   "Bash",
   "git reset --hard HEAD~1"
  ],
  [
   "Bash",
   "git clean -fd"
  ],
  [
   "Bash",
   "git clean -fdx"
  ],
  [
   "Bash",
   "git branch -D essai"
  ],
  [
   "Bash",
   "git stash clear"
  ],
  [
   "Bash",
   "git -C /depot reset --hard"
  ],
  [
   "Bash",
   "bash -lc 'git reset --hard'"
  ],
  [
   "Bash",
   "git fetch && git reset --hard origin/main"
  ],
  [
   "Bash",
   "ssh root@serveur bash <<'EOF'\nterraform apply\nEOF"
  ],
  [
   "Bash",
   "X=$(git reset --hard)"
  ],
  [
   "Bash",
   "eval 'git clean -fd'"
  ],
  [
   "PowerShell",
   "Remove-Item -Recurse -Force C:\\Users\\moi"
  ],
  [
   "PowerShell",
   "git reset --hard"
  ],
  [
   "PowerShell",
   "Remove-Item -Recurse *"
  ],
  [
   "Bash",
   "kubectl delete pod web-1"
  ],
  [
   "Bash",
   "kubectl -n prod delete deployment appli"
  ],
  [
   "Bash",
   "kubectl delete -f manifeste.yaml"
  ],
  [
   "Bash",
   "kubectl delete namespace essai"
  ],
  [
   "Bash",
   "kubectl delete pvc donnees-postgres -n prod"
  ],
  [
   "Bash",
   "kubectl delete crd certificates.cert-manager.io"
  ],
  [
   "Bash",
   "kubectl delete pods --all -n essai"
  ],
  [
   "Bash",
   "kubectl --context prod delete svc/web"
  ],
  [
   "Bash",
   "sudo kubectl delete ns essai"
  ],
  [
   "Bash",
   "helm uninstall appli -n prod"
  ],
  [
   "Bash",
   "helm -n prod delete appli"
  ],
  [
   "Bash",
   "ssh admin@bastion 'helm uninstall appli'"
  ],
  [
   "Bash",
   "flux delete kustomization appli"
  ],
  [
   "Bash",
   "flux uninstall"
  ],
  [
   "Bash",
   "restic forget --keep-last 7"
  ],
  [
   "Bash",
   "restic -r s3:https://s3.example.com/sauvegardes forget --keep-daily 7 --prune"
  ],
  [
   "Bash",
   "restic prune"
  ],
  [
   "Bash",
   "RESTIC_REPOSITORY=/srv/depot restic forget abc123"
  ],
  [
   "Bash",
   "docker exec sauvegarde restic forget --prune --keep-last 3"
  ],
  [
   "Bash",
   "sh -c 'restic prune'"
  ],
  [
   "Bash",
   "aws s3 rm s3://seau/fichier.txt"
  ],
  [
   "Bash",
   "aws s3 rm s3://seau/dossier --recursive"
  ],
  [
   "Bash",
   "aws --profile prod s3 rb s3://seau --force"
  ],
  [
   "Bash",
   "aws s3 sync . s3://seau/site --delete"
  ],
  [
   "Bash",
   "aws s3api delete-bucket --bucket seau"
  ],
  [
   "Bash",
   "aws ec2 terminate-instances --instance-ids i-0123456789abcdef0"
  ],
  [
   "Bash",
   "aws rds delete-db-instance --db-instance-identifier base"
  ],
  [
   "Bash",
   "az storage blob delete-batch --source conteneur --account-name compte"
  ],
  [
   "Bash",
   "az vm delete -g rg -n vm1"
  ],
  [
   "Bash",
   "rclone delete distant:sauvegardes/vieux"
  ],
  [
   "Bash",
   "rclone purge distant:seau/dossier"
  ],
  [
   "Bash",
   "rclone deletefile distant:seau/a.txt"
  ],
  [
   "Bash",
   "rclone rmdirs distant:seau/vide"
  ],
  [
   "Bash",
   "rclone sync ./site distant:seau/site"
  ],
  [
   "Bash",
   "mc rm --recursive --force minio/seau/dossier"
  ],
  [
   "Bash",
   "mc rb minio/seau"
  ],
  [
   "Bash",
   "mc mirror --remove ./site minio/seau"
  ],
  [
   "Bash",
   "s3cmd del s3://seau/fichier.txt"
  ],
  [
   "Bash",
   "s3cmd rb s3://seau"
  ],
  [
   "Bash",
   "s3cmd sync --delete-removed ./site s3://seau/"
  ],
  [
   "Bash",
   "curl -X DELETE https://api.example.com/v1/objets/42"
  ],
  [
   "Bash",
   "curl -sS -XDELETE https://api.example.com/v1/objets/42"
  ],
  [
   "Bash",
   "curl --request DELETE https://api.example.com/v1/objets/42"
  ],
  [
   "Bash",
   "curl --request=delete https://api.example.com/v1/objets/42"
  ],
  [
   "Bash",
   "curl -H 'Authorization: Bearer $T' -X DELETE https://api.example.com/v1/objets/42 | jq ."
  ],
  [
   "Bash",
   "wget --method=DELETE -O- https://api.example.com/v1/objets/42"
  ],
  [
   "Bash",
   "wget --method DELETE https://api.example.com/v1/objets/42"
  ],
  [
   "Bash",
   "http DELETE https://api.example.com/v1/objets/42"
  ],
  [
   "Bash",
   "https -a moi:mdp DELETE api.example.com/v1/objets/42"
  ],
  [
   "Bash",
   "ssh hote 'curl -X DELETE http://localhost:9200/index'"
  ],
  [
   "Bash",
   "docker exec web curl -X DELETE http://localhost/api/cache"
  ],
  [
   "Bash",
   "zfs destroy tank/donnees"
  ],
  [
   "Bash",
   "zfs destroy -r tank/donnees"
  ],
  [
   "Bash",
   "sudo zpool destroy tank"
  ],
  [
   "Bash",
   "lvremove /dev/vg0/donnees"
  ],
  [
   "Bash",
   "sudo vgremove vg0"
  ],
  [
   "Bash",
   "pvremove /dev/sdb1"
  ],
  [
   "Bash",
   "ssh hote 'sudo lvremove -y /dev/vg0/donnees'"
  ]
 ],
 "passe": [
  [
   "Bash",
   "terraform init"
  ],
  [
   "Bash",
   "terraform validate"
  ],
  [
   "Bash",
   "terraform fmt -recursive"
  ],
  [
   "Bash",
   "terraform plan"
  ],
  [
   "Bash",
   "terraform plan -destroy"
  ],
  [
   "Bash",
   "terraform plan -destroy -out=tfplan"
  ],
  [
   "Bash",
   "terraform output"
  ],
  [
   "Bash",
   "terraform state list"
  ],
  [
   "Bash",
   "terraform workspace list"
  ],
  [
   "Bash",
   "terraform import aws_instance.web i-123"
  ],
  [
   "Bash",
   "terraform providers"
  ],
  [
   "Bash",
   "terraform plan -destroy | tee plan.txt"
  ],
  [
   "Bash",
   "terragrunt run-all plan"
  ],
  [
   "Bash",
   "gcloud compute instances list"
  ],
  [
   "Bash",
   "gcloud compute instances describe vm-1"
  ],
  [
   "Bash",
   "gcloud config set project essai"
  ],
  [
   "Bash",
   "gcloud sql instances create base --tier=db-f1-micro"
  ],
  [
   "Bash",
   "gcloud storage ls gs://seau"
  ],
  [
   "Bash",
   "gcloud storage cp a.txt gs://seau/"
  ],
  [
   "Bash",
   "gcloud run deploy api --image=img"
  ],
  [
   "Bash",
   "gsutil ls"
  ],
  [
   "Bash",
   "gsutil cp -r dossier gs://seau"
  ],
  [
   "Bash",
   "gsutil rsync -r local gs://seau"
  ],
  [
   "Bash",
   "bq ls"
  ],
  [
   "Bash",
   "bq query 'SELECT 1'"
  ],
  [
   "Bash",
   "rm fichier.txt"
  ],
  [
   "Bash",
   "rm -f a.log b.log"
  ],
  [
   "Bash",
   "rm -rf node_modules"
  ],
  [
   "Bash",
   "rm -rf build/ dist/"
  ],
  [
   "Bash",
   "rm -rf /tmp/essai-123"
  ],
  [
   "Bash",
   "rm -rf ./build/*"
  ],
  [
   "Bash",
   "rm -rf /home/user/projets/app/node_modules"
  ],
  [
   "Bash",
   "rm -rf \"$tmp\""
  ],
  [
   "Bash",
   "rm -rf ~/projets/app/.cache"
  ],
  [
   "Bash",
   "rm -r src/ancien 2>/dev/null"
  ],
  [
   "Bash",
   "rm -rf sortie > /dev/null"
  ],
  [
   "Bash",
   "rm -rf sortie >/dev/null 2>&1"
  ],
  [
   "Bash",
   "rm -rf $DOSSIER/cache/tmp"
  ],
  [
   "Bash",
   "rm -rf ../autre/build"
  ],
  [
   "Bash",
   "find . -name '*.pyc' -delete"
  ],
  [
   "Bash",
   "find /var/log -name '*.log'"
  ],
  [
   "Bash",
   "find . -type d -name __pycache__ -exec rm -rf {} +"
  ],
  [
   "Bash",
   "dd if=/dev/zero of=fichier.img bs=1M count=10"
  ],
  [
   "Bash",
   "dd if=/dev/sda of=/dev/null"
  ],
  [
   "Bash",
   "docker image prune -f"
  ],
  [
   "Bash",
   "docker ps -a"
  ],
  [
   "Bash",
   "docker rm -f conteneur"
  ],
  [
   "Bash",
   "docker compose down"
  ],
  [
   "Bash",
   "docker compose up -d"
  ],
  [
   "Bash",
   "docker volume ls"
  ],
  [
   "Bash",
   "docker builder prune -f"
  ],
  [
   "Bash",
   "docker exec app rm -rf /var/cache/app/tmp"
  ],
  [
   "Bash",
   "docker run --rm -v data:/data alpine ls /data"
  ],
  [
   "Bash",
   "git push"
  ],
  [
   "Bash",
   "git push origin main"
  ],
  [
   "Bash",
   "git push -u origin fonctionnalite"
  ],
  [
   "Bash",
   "git push --tags"
  ],
  [
   "Bash",
   "git reset --soft HEAD~1"
  ],
  [
   "Bash",
   "git reset HEAD fichier"
  ],
  [
   "Bash",
   "git clean -n"
  ],
  [
   "Bash",
   "git clean -nfd"
  ],
  [
   "Bash",
   "git branch -d fusionnee"
  ],
  [
   "Bash",
   "git stash"
  ],
  [
   "Bash",
   "git stash drop"
  ],
  [
   "Bash",
   "git commit -m 'terraform destroy retiré'"
  ],
  [
   "Bash",
   "git log --oneline"
  ],
  [
   "Bash",
   "git rm -r ancien/"
  ],
  [
   "Bash",
   "git checkout -b essai"
  ],
  [
   "Bash",
   "git -c user.name=x commit -m y"
  ],
  [
   "Bash",
   "echo 'terraform destroy -auto-approve'"
  ],
  [
   "Bash",
   "grep -r 'rm -rf /' docs"
  ],
  [
   "Bash",
   "ls -la"
  ],
  [
   "Bash",
   "kubectl get pods"
  ],
  [
   "Bash",
   "sudo apt-get update"
  ],
  [
   "Bash",
   "cat > notes.txt <<'EOF'\nterraform destroy -auto-approve\nrm -rf /\nEOF"
  ],
  [
   "Bash",
   "git commit -m \"$(cat <<'EOF'\nretire la ligne\nrm -rf /\nEOF\n)\""
  ],
  [
   "Bash",
   "ssh root@serveur 'ls /var && df -h'"
  ],
  [
   "Bash",
   "bash -c 'terraform plan'"
  ],
  [
   "PowerShell",
   "Remove-Item fichier.txt"
  ],
  [
   "PowerShell",
   "Remove-Item -Recurse -Force .\\build\\sortie"
  ],
  [
   "PowerShell",
   "Get-ChildItem -Recurse C:\\"
  ],
  [
   "PowerShell",
   "terraform plan"
  ],
  [
   "Bash",
   "kubectl get ns"
  ],
  [
   "Bash",
   "kubectl describe pvc donnees"
  ],
  [
   "Bash",
   "kubectl apply -f manifeste.yaml"
  ],
  [
   "Bash",
   "kubectl delete pod web-1 --dry-run=client"
  ],
  [
   "Bash",
   "kubectl delete ns essai --dry-run=server -o yaml"
  ],
  [
   "Bash",
   "kubectl -n prod exec -it web-1 -- ls /"
  ],
  [
   "Bash",
   "kubectl logs deploy/appli"
  ],
  [
   "Bash",
   "helm list -A"
  ],
  [
   "Bash",
   "helm upgrade --install appli ./chart -n prod"
  ],
  [
   "Bash",
   "helm uninstall appli --dry-run"
  ],
  [
   "Bash",
   "flux get kustomizations"
  ],
  [
   "Bash",
   "flux reconcile kustomization appli"
  ],
  [
   "Bash",
   "restic snapshots"
  ],
  [
   "Bash",
   "restic -r /srv/depot check"
  ],
  [
   "Bash",
   "restic backup /home"
  ],
  [
   "Bash",
   "restic forget --keep-last 7 --dry-run"
  ],
  [
   "Bash",
   "restic forget -n --prune --keep-daily 7"
  ],
  [
   "Bash",
   "aws s3 ls s3://seau"
  ],
  [
   "Bash",
   "aws s3 cp fichier.txt s3://seau/"
  ],
  [
   "Bash",
   "aws s3 sync . s3://seau/site"
  ],
  [
   "Bash",
   "aws s3 rm s3://seau/dossier --recursive --dryrun"
  ],
  [
   "Bash",
   "aws ec2 describe-instances"
  ],
  [
   "Bash",
   "aws ec2 terminate-instances --instance-ids i-0123456789abcdef0 --dry-run"
  ],
  [
   "Bash",
   "aws s3 cp delete-moi.txt s3://seau/"
  ],
  [
   "Bash",
   "az vm list -o table"
  ],
  [
   "Bash",
   "az group show --name rg"
  ],
  [
   "Bash",
   "rclone copy ./site distant:seau/site"
  ],
  [
   "Bash",
   "rclone ls distant:seau"
  ],
  [
   "Bash",
   "rclone sync ./site distant:seau/site --dry-run"
  ],
  [
   "Bash",
   "rclone purge -n distant:seau/dossier"
  ],
  [
   "Bash",
   "mc ls minio/seau"
  ],
  [
   "Bash",
   "mc cp fichier.txt minio/seau/"
  ],
  [
   "Bash",
   "mc mirror ./site minio/seau"
  ],
  [
   "Bash",
   "s3cmd ls s3://seau"
  ],
  [
   "Bash",
   "s3cmd sync ./site s3://seau/"
  ],
  [
   "Bash",
   "curl -X GET https://api.example.com/v1/objets"
  ],
  [
   "Bash",
   "curl -sS https://api.example.com/v1/objets/42"
  ],
  [
   "Bash",
   "curl -X POST -d '{\"a\":1}' https://api.example.com/v1/objets"
  ],
  [
   "Bash",
   "curl https://api.example.com/v1/delete-preview"
  ],
  [
   "Bash",
   "wget https://example.com/archive.tar.gz"
  ],
  [
   "Bash",
   "http GET https://api.example.com/v1/objets"
  ],
  [
   "Bash",
   "http https://api.example.com/v1/objets/delete"
  ],
  [
   "Bash",
   "zfs list"
  ],
  [
   "Bash",
   "zfs snapshot tank/donnees@avant"
  ],
  [
   "Bash",
   "zfs destroy -n tank/donnees@vieux"
  ],
  [
   "Bash",
   "zpool status"
  ],
  [
   "Bash",
   "lvs"
  ],
  [
   "Bash",
   "lvcreate -L 10G -n donnees vg0"
  ],
  [
   "Bash",
   "systemctl stop appli"
  ],
  [
   "Bash",
   "docker rm -f web"
  ]
 ],
 "refusPerso": [
  [
   "Bash",
   "dropdb appli"
  ],
  [
   "Bash",
   "sudo -u postgres dropdb appli"
  ]
 ],
 "demandePerso": [
  [
   "Bash",
   "psql -d appli -c 'DROP TABLE essai'"
  ],
  [
   "Bash",
   "ssh hote 'mysql -e \"TRUNCATE journal\"'"
  ]
 ]
}
