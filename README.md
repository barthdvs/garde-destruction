# garde-destruction — plugin Claude Code

Soumet à ta confirmation les commandes qui détruisent (`terraform destroy`, `gcloud … delete`,
`git reset --hard`, `docker volume rm`, `kubectl delete`, `helm uninstall`, `aws s3 rm`, `rclone purge`,
`restic forget`, `curl -X DELETE`, `zfs destroy`…) et refuse celles qui détruisent trop large ou sans confirmation possible.

```
claude plugin marketplace add barthdvs/garde-destruction
claude plugin install garde-destruction@garde-destruction
```

Mode d'emploi complet : [plugins/garde-destruction/README.md](plugins/garde-destruction/README.md).
