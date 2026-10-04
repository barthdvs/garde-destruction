#!/usr/bin/env python3
"""Banc d'essai de garde-destruction : python3 tests/cas.py (doit finir par « 0 échec »).

Rien n'est exécuté : chaque commande est seulement soumise au garde, qui répond refus, demande ou rien.
"""
import json, subprocess, os, sys, tempfile
G = os.path.join(os.path.dirname(__file__), "..", "hooks-handlers", "garde.py")

# Cas communs aux deux moteurs : ce qui suit « export const CAS = » dans cas-communs.ts est du JSON.
with open(os.path.join(os.path.dirname(__file__), "cas-communs.ts"), encoding="utf-8") as f:
    CAS = json.loads(f.read().split("export const CAS = ", 1)[1])


def decision(outil, commande, regles, cwd):
    env = dict(os.environ, GARDE_DESTRUCTION_REGLES=regles)
    ev = {"tool_name": outil, "tool_input": {"command": commande}, "cwd": cwd}
    r = subprocess.run([sys.executable, G], input=json.dumps(ev), capture_output=True, text=True, timeout=30, env=env)
    out = r.stdout.strip()
    if not out: return "passe", ""
    h = json.loads(out)["hookSpecificOutput"]
    return {"deny": "refus", "ask": "demande"}[h["permissionDecision"]], h.get("permissionDecisionReason", "")


def g(rep, *args):
    subprocess.run(["git", "-C", rep, "-c", "user.name=essai", "-c", "user.email=essai@example.com"] + list(args),
                   check=True, capture_output=True)


total = echecs = 0


def attendu(voulu, outil, commande, regles, cwd, etiquette="", contient=None):
    global total, echecs
    total += 1
    d, raison = decision(outil, commande, regles, cwd)
    if d != voulu:
        echecs += 1; print("ÉCHEC (voulu : %s, obtenu : %s) %s:" % (voulu, d, etiquette), outil, commande[:110])
    elif contient and contient not in raison:
        echecs += 1; print("ÉCHEC (le message ne contient pas « %s ») :" % contient, raison[:160])


with tempfile.TemporaryDirectory() as d:
    hors = os.path.join(d, "hors-depot")  # dossier sans dépôt git : la branche courante y est inconnue
    os.makedirs(hors)
    vide = os.path.join(d, "absent.txt")  # aucune règle personnelle
    perso = os.path.join(d, "regles.txt")
    with open(perso, "w", encoding="utf-8") as f:
        f.write("# essai\n(psql|mysql).*(DROP|TRUNCATE)\nrefus: dropdb\n(règle invalide\n")
    for voulu in ("refus", "demande", "passe"):
        for outil, c in CAS[voulu]: attendu(voulu, outil, c, vide, hors)
    for outil, c in CAS["refusPerso"]: attendu("refus", outil, c, perso, hors, "règle personnelle")
    for outil, c in CAS["demandePerso"]: attendu("demande", outil, c, perso, hors, "règle personnelle")
    for voulu in ("refus", "demande", "passe"):  # les règles personnelles ne retirent rien
        for outil, c in CAS[voulu][:5]: attendu(voulu, outil, c, perso, hors, "avec règles personnelles")

    # git push --force sans branche nommée : c'est la branche courante qui décide
    rep = os.path.join(d, "depot")
    os.makedirs(os.path.join(rep, "sous"))
    g(rep, "init", "-q", "-b", "main")
    with open(os.path.join(rep, "README.md"), "w", encoding="utf-8") as f:
        f.write("# essai\n")
    g(rep, "add", "."); g(rep, "commit", "-q", "-m", "init")
    attendu("refus", "Bash", "git push --force", vide, rep, "push forcé depuis main", contient="main")
    attendu("refus", "Bash", "git push -f origin HEAD", vide, rep, "push forcé de HEAD depuis main")
    attendu("refus", "Bash", "cd sous && git push --force-with-lease", vide, rep, "cd puis push forcé")
    attendu("refus", "Bash", "git -C %s push -f" % rep, vide, hors, "push forcé avec -C")
    attendu("demande", "Bash", "ssh hote 'cd /srv/depot && git push --force'", vide, rep, "push forcé distant : branche inconnue")
    attendu("passe", "Bash", "git push", vide, rep, "push simple depuis main")
    g(rep, "checkout", "-q", "-b", "fonctionnalite")
    attendu("demande", "Bash", "git push --force", vide, rep, "push forcé depuis une autre branche")
    attendu("refus", "Bash", "git push --force origin main", vide, rep, "push forcé de main depuis une autre branche")

    # les messages : signés, et clairs sur la suite
    attendu("refus", "Bash", "terraform destroy -auto-approve", vide, hors, contient="garde-destruction : « terraform destroy »")
    attendu("refus", "Bash", "terraform destroy -auto-approve", vide, hors, contient="plan -destroy -out=")
    attendu("demande", "Bash", "gcloud sql instances delete base-prod", vide, hors, contient="« gcloud sql instances delete base-prod »")
    attendu("demande", "Bash", "terraform apply && git reset --hard", vide, hors, contient="git reset --hard")
    attendu("refus", "Bash", "terraform apply && rm -rf /", vide, hors, contient="rm")

print("%d cas, %d échec" % (total, echecs))
sys.exit(1 if echecs else 0)
