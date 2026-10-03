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
  ]
 ],
 "refusPerso": [
  [
   "Bash",
   "helm uninstall appli"
  ],
  [
   "Bash",
   "sudo helm uninstall appli -n prod"
  ]
 ],
 "demandePerso": [
  [
   "Bash",
   "kubectl delete pod x"
  ],
  [
   "Bash",
   "ssh hote 'kubectl delete ns essai'"
  ]
 ]
}
