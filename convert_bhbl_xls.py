#!/usr/bin/env python3
"""Convert a BHBL stats workbook (.xls, one sheet per team) into the app's history-import CSV."""
import sys, csv, math
import pandas as pd

def outs_from_decimal_ip(ip):
    # His IP uses decimal thirds: 40.67 = 40 2/3. Round IP*3 to nearest out.
    try:
        v = float(ip)
    except (TypeError, ValueError):
        return 0
    if math.isnan(v): return 0
    return int(round(v * 3))

def outs_to_baseball_ip(outs):
    return f"{outs//3}.{outs%3}"

def clean(v):
    if v is None or (isinstance(v, float) and math.isnan(v)): return ""
    s = str(v).strip()
    return s

def n(v):
    try:
        f = float(v)
        if math.isnan(f): return 0
        return int(round(f))
    except (TypeError, ValueError):
        return 0

def convert(xls_path, season_number, out_path, champion=None):
    sheets = pd.read_excel(xls_path, sheet_name=None, header=None)
    H = ["Section","Season","Team","Player","Pos","AB","H","HR","RBI","R",
         "GP","IP","P_R","P_ER","P_SO","W","L","SV","MVP","Award"]
    rows = [H]
    blank = {k:"" for k in H}
    teams_done = []

    for sheet_name, df in sheets.items():
        if sheet_name.strip().lower() == "template": continue
        if sheet_name.strip().lower().startswith("awards"):
            continue  # handled separately below
        grid = df.values.tolist()
        team = clean(grid[0][0]) or sheet_name
        col0 = [clean(r[0]) for r in grid]

        def find(label, start=0):
            for i in range(start, len(col0)):
                if col0[i].lower().startswith(label): return i
            return -1

        bat_hdr = find("player")                       # batting header row
        bat_end = find("team totals", bat_hdr+1)
        pit_lbl = find("pitching", bat_end+1 if bat_end>=0 else 0)
        pit_hdr = find("player", pit_lbl+1) if pit_lbl>=0 else -1
        pit_end = find("team totals", pit_hdr+1) if pit_hdr>=0 else -1
        vs_lbl  = find("vs", pit_end+1 if pit_end>=0 else 0)
        tot_row = find("total", vs_lbl+1) if vs_lbl>=0 else -1

        nb = np = 0
        # Batting: Player, AB, Hits, HR, RBI, AVG, MVP, Position
        if bat_hdr>=0 and bat_end>bat_hdr:
            for r in grid[bat_hdr+1:bat_end]:
                player = clean(r[0])
                if not player: continue
                ab, hits, hr, rbi, mvp = n(r[1]), n(r[2]), n(r[3]), n(r[4]), n(r[6])
                pos = clean(r[7]) if len(r)>7 else ""
                if ab==0 and hits==0 and hr==0 and rbi==0 and mvp==0: continue  # never appeared
                row = dict(blank, Section="Batting", Season=season_number, Team=team, Player=player,
                           Pos=pos, AB=ab, H=hits, HR=hr, RBI=rbi, MVP=mvp or "")
                rows.append([row[k] for k in H]); nb+=1

        # Pitching: Player, W, L, S, So, ERA, IP, RA, GP
        if pit_hdr>=0 and pit_end>pit_hdr:
            for r in grid[pit_hdr+1:pit_end]:
                player = clean(r[0])
                if not player: continue
                w,l,sv,so = n(r[1]), n(r[2]), n(r[3]), n(r[4])
                outs = outs_from_decimal_ip(r[6])
                ra, gp = n(r[7]), n(r[8]) if len(r)>8 else 0
                if outs==0 and gp==0 and w==0 and l==0 and sv==0: continue
                row = dict(blank, Section="Pitching", Season=season_number, Team=team, Player=player,
                           GP=gp, IP=outs_to_baseball_ip(outs), P_R=ra, P_ER=ra, P_SO=so, W=w, L=l, SV=sv)
                rows.append([row[k] for k in H]); np+=1

        # Record: prefer pitching "Team Totals" W/L (always present); fall back to "vs ... total"
        rec_w = rec_l = None
        if pit_end>=0:
            rec_w, rec_l = n(grid[pit_end][1]), n(grid[pit_end][2])
        elif tot_row>=0:
            rec_w, rec_l = n(grid[tot_row][1]), n(grid[tot_row][2])
        if rec_w is not None and (rec_w or rec_l):
            row = dict(blank, Section="Record", Season=season_number, Team=team, W=rec_w, L=rec_l)
            rows.append([row[k] for k in H])

        teams_done.append((team, nb, np))

    # ---- Awards All Star sheet (optional): All Stars, Award Winners, Standings/Champion ----
    award_map = {
        "cy young":"CyYoung", "cyyoung":"CyYoung",
        "mvp":"MVP",
        "batting champ":"BattingChamp", "batting champion":"BattingChamp",
        "world series mvp":"WSMVP", "ws mvp":"WSMVP",
    }
    aw_sheet = next((s for s in sheets if s.strip().lower().startswith("awards")), None)
    auto_champ = None
    if aw_sheet is not None:
        g = sheets[aw_sheet].values.tolist()
        def col_of(grid, *labels):
            for ri, r in enumerate(grid):
                for ci, v in enumerate(r):
                    if clean(v).lower() in labels:
                        return ri, ci
            return -1, -1
        as_r, as_c = col_of(g, "all stars")
        aw_r, aw_c = col_of(g, "award winners")

        # All Stars block: header at (as_r, as_c). Layout per row:
        #   position at as_c-1, player name at as_c, team at as_c+1.
        # Data begins on the header row itself and continues downward.
        if as_r >= 0:
            for r in g[as_r:]:
                pos  = clean(r[as_c-1]) if as_c-1 >= 0 and len(r) > as_c-1 else ""
                name = clean(r[as_c])   if len(r) > as_c   else ""
                team = clean(r[as_c+1]) if len(r) > as_c+1 else ""
                if name.lower() == "all stars" or team.lower() == "team": continue  # header cells
                if not name or not pos: continue
                rows.append([dict(blank, Section="AllStar", Season=season_number, Team=team, Player=name, Pos=pos.upper())[k] for k in H])

        # Award Winners block: label at aw_c, player at aw_c+1, team at aw_c+2.
        if aw_r >= 0:
            for r in g[aw_r+1:]:
                award = clean(r[aw_c])   if len(r) > aw_c   else ""
                name  = clean(r[aw_c+1]) if len(r) > aw_c+1 else ""
                team  = clean(r[aw_c+2]) if len(r) > aw_c+2 else ""
                if not award: continue
                a_low = award.lower()
                if a_low == "champion":
                    auto_champ = name or team
                    continue
                if a_low == "best record":
                    rows.append([dict(blank, Section="Award", Season=season_number, Team=(name or team), Player="", Award="BestRecord")[k] for k in H])
                    continue
                code = award_map.get(a_low)
                if code and name:
                    rows.append([dict(blank, Section="Award", Season=season_number, Team=team, Player=name, Award=code)[k] for k in H])

    if champion is None and auto_champ:
        champion = auto_champ

    if champion:
        row = dict(blank, Section="Champion", Season=season_number, Team=champion)
        rows.append([row[k] for k in H])

    with open(out_path, "w", newline="") as f:
        csv.writer(f).writerows(rows)
    return teams_done

if __name__ == "__main__":
    xls, sn, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    champ = sys.argv[4] if len(sys.argv)>4 else None
    done = convert(xls, sn, out, champ)
    for t, nb, np in done:
        print(f"{t}: {nb} batters, {np} pitchers")
    print(f"-> {out}")
