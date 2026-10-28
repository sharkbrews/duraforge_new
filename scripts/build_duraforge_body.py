#!/usr/bin/env python3
"""Rewrite the Royal catalogue body text in Duraforge's voice, locally.

Prose is split into sentences, series codes are masked, and each sentence is
matched to a canonical Duraforge sentence. Series codes are filled back in.
Order-code examples are dropped because they use the supplier format. Bullet
fragments are mapped through a dictionary. Tables are copied unchanged apart
from "Ask ROYAL" cells. Nothing here calls an AI service.

Input and output live in the git-ignored docs/catalogue/ folder.
Exit code is 1 if any segment is unmapped or validation fails.
"""

import csv
import difflib
import re
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "catalogue" / "royal-catalogue-combined.md"
OUT = ROOT / "docs" / "catalogue" / "duraforge-catalogue-body.md"
MAP = ROOT / "docs" / "catalogue" / "duraforge-body-map.csv"

THRESHOLD = 0.82
FRAG_THRESHOLD = 0.9

# Series codes: letters+digits (DS011, PS040-01), uppercase code with a space (PS 120,
# PNRS 010), or a two-digit material suffix after "& " (PS040-02 & 03).
SERIES_RE = re.compile(
    r"\b(?:[A-Za-z]{1,4}-?\d{2,3}(?:-\d{2,3})*|[A-Z]{2,4} \d{2,3}\b|(?<=& )\d{2})\b"
)
EXAMPLE_RE = re.compile(
    r"^Example\b|Order [Cc]ode (?:is|for)\b|^Size\s*:?\s*\d|^(?:Metric|Imperial) Size\s*\d"
    r"|\((?:O|T) ring material|\d\s*X\s*\d"
)
TEMP_RE = re.compile(r"Temp range:\s*(\S+ to \S+)")
SPLIT_RE = re.compile(
    r"(?<=[.!?])\s+(?=[A-Z{(\"'])"
    r"|\s+(?=Order [Cc]ode (?:is|for)\b|Example\b|(?:Metric|Imperial) Size\s*\d|Size\s*\d"
    r"|\((?:O|T) ring material|For Temp\b|For any other\b|\d+\)\s"
    r"|The (?:PTFE|split polyamide|polyamide) ring is then\b)"
)
BULLET_SPLIT_RE = re.compile(r"((?:Properties|Application|Operating limit)\s*:)")
PAGE_HEADING_RE = re.compile(r"^## Page \d+$")
PAGE_NO_RE = re.compile(r"^\d+$")
RUNNING_HEADER = "SEALS FOR HYDRAULICS & PNEUMATICS"
END_MARKER_RE = re.compile(r"^\d+ rows had no numeric dN")
TABLE_MARKER_RE = re.compile(r"^(.*?)\s*\*\*(Table \d+)\*\*$")
SECTION_RE = re.compile(r"^Section\s*-\s*([IVX]+)$")
NUMBER_PREFIX_RE = re.compile(r"^(\d+\))\s+(.*)$")
CAPTION_PASS_RE = re.compile(
    r"^CROSS SECTION [\d.]+ mm$"
    r"|^(?:Metric|Imperial)$|^(?:Metric|Imperial) Sizes? \((?:mm|inch)\)$"
    r"|^\((?:h9|H9)\)|^20°|^Ø"
)

# Canonical Duraforge sentences. Variants are source wordings (with {SERIES} for
# masked codes). The template is the Duraforge text, with {SERIES} in the same
# order as the codes in the source.
CANON = [
    ("intro-company", [
        "Headquartered in Kolkata, India Royal takes pride in providing technical expertise and customize sealing solutions for all your hydraulic and pneumatic cylinder applications.",
    ], "Duraforge UK Ltd provides technical expertise and customised sealing solutions for all your hydraulic and pneumatic cylinder applications. We are based in Swanscombe, Kent, and supply professional trade customers across the UK."),
    ("intro-range", [
        "From Mining machineries to construction equipment's, from agricultural machinery to material handling equipment's, we offer complete solutions for all your dynamic seal requirements.",
    ], "From mining and construction plant to agricultural machinery and material handling, we supply complete solutions for all your dynamic seal requirements."),
    ("intro-materials", [
        "All our seals are made of high-performance polymers materials like Polyurethane, PTFE, Polyamide, NBR Rubber, Polyester resins, Polyoxymethylene etc.",
    ], "Our seals are made from high-performance materials including polyurethane (PU), PTFE, polyamide, NBR rubber, polyester resin and polyoxymethylene (POM)."),
    ("compound-ref", [
        "For compound detail please refer Royal seal compounds (Section III).",
        "For compound detail please refer Royal seal compounds.",
    ], "For compound details, see the seal compounds section (Section III)."),
    ("temp-combos", [
        "{SERIES} have two different type of combination for different temperature range as per following table: For compound detail please refer Royal seal compounds (Section III).",
    ], "{SERIES} is available in two material combinations for different temperature ranges, as shown in the following table. For compound details, see the seal compounds section (Section III)."),
    ("gap-decisive", [
        "The gap dimension on the non-pressurised side of the seal is decisive for sealing function.",
    ], "The extrusion gap on the low-pressure side of the seal is critical to sealing performance."),
    ("easy-fit", [
        "{SERIES} is very easy to fit.",
    ], "{SERIES} is simple to fit."),
    ("careful-seal", [
        "Careful fitting of the seal is a prerequisite for it's perfect functioning.",
        "Careful fitting of the seal is a pre-requisite for it's perfect functioning.",
        "Careful fitting of the seal is a prerequisite for it's perfect function.",
        "Careful fitting of the seal is a pre-requisite for it's perfect",
    ], "Careful fitting is essential for the seal to perform correctly."),
    ("careful-wiper", [
        "Careful fitting is prerequisite for perfect functioning of the wiper.",
        "Careful fitting is prerequisite for perfect functioning of the",
        "Careful fitting is prerequisite for perfect",
    ], "Careful fitting is essential for the wiper to perform correctly."),
    ("careful-guide", [
        "Careful fitting of the Guide ring is a prerequisite for it's perfect functioning.",
    ], "Careful fitting of the guide ring is essential for it to perform correctly."),
    ("clearance-piston", [
        "Figures show the maximum radial clearance on each side using the minimum piston OD and max bore Ø considering respective tolerances.",
    ], "Figures show the maximum radial clearance on each side, based on the minimum piston OD and maximum bore Ø, including the respective tolerances."),
    ("clearance-gland", [
        "Figures show the maximum radial clearance on each side using maximum gland bush groove inner dia and minimum rod dia considering respective tolerances.",
        "Figures show the maximum radial clearance on each side using maximum gland bush groove inner dia and minimum rod dia considering respective",
    ], "Figures show the maximum radial clearance on each side, based on the maximum gland bush groove inner diameter and the minimum rod diameter, including the respective tolerances."),
    ("clearance-both", [
        "Figures show the maximum radial clearance on each side using the minimum piston OD and max bore Ø considering respective tolerances as well as maximum gland bush groove inner dia and minimum rod dia considering respective tolerances.",
        "Figures show the maximum radial clearance on each side using the minimum piston OD and max bore Ø considering respective tolerances as well as maximum gland bush groove inner dia and minimum rod dia considering respective",
    ], "Figures show the maximum radial clearance on each side, based on the minimum piston OD and maximum bore Ø, and on the maximum gland bush groove inner diameter and minimum rod diameter, including the respective tolerances."),
    ("order-quote", [
        "Please mention ROYAL order code in your order.",
        "Please Follow ROYAL order code to place your order.",
        "Please mention ROYAL Order Code in your order.",
        "Please mention ROYAL order code in your order",
    ], "When ordering, quote the Duraforge product code (DF-) from the product page. Supplier and cross-reference codes are also accepted."),
    ("contact-imperial", [
        "For Imperial (inch) sizes please contact ROYAL at info@royalcomposites.co.in / info@royalseals.co.in",
        "For Imperial (inch) sizes please contact ROYAL at info@royalcomposites.co.in",
    ], "For imperial (inch) sizes, please use the enquiry form on our website."),
    ("contact-size", [
        "Please contact ROYAL at info@royalcomposites.co.in / info@royalseals.co.in if your required size is not mentioned in Royal standard size list",
        "Please contact ROYAL at info@royalcomposites.co.in / info@royalseals.co.in if your required size is not mentioned in Royal standard size list or if you need a different combination.",
        "Please contact ROYAL at info@royalcomposites.co.in / info@royalseals.co.in if your required size is not mentioned in Royal standard size list or if you need a different combination",
    ], "If your required size is not listed, or you need a different combination, please use the enquiry form on our website."),
    ("contact-availability", [
        "Please Contact ROYAL at info@royalcomposites.co.in for availability of {SERIES} & {SERIES} Series before placing your order.",
        "Please Contact ROYAL at info@royalcomposites.co.in for availability of {SERIES} & {SERIES} Series before placing your",
    ], "Please use the enquiry form on our website to check availability of {SERIES} and {SERIES} series before placing your order."),
    ("ask-option", [
        "If this option is required ask ROYAL.",
        "use of a back up ring. If this option is required ask ROYAL.",
    ], "If this option is required, please use the enquiry form on our website."),
    ("max-pressure-note", [
        "Maximum working pressure can be extended up to 400 bar with the use of a back up ring.",
    ], "Maximum working pressure can be extended to 400 bar with a backup ring."),
    ("pressure-extend", [
        "Maximum working pressure can be extended for {SERIES} up to 400 bar and for {SERIES} & {SERIES} up to 250 bar with the use of a back up ring.",
    ], "Maximum working pressure can be extended to 400 bar for {SERIES}, and to 250 bar for {SERIES} & {SERIES}, with a backup ring."),
    ("size-list-contact", [
        "For size list of {SERIES} (FPM Material) & {SERIES}(NBR Material) contact ROYAL at info@royalcomposites.co.in",
    ], "For the size list of {SERIES} (FPM material) and {SERIES} (NBR material), please use the enquiry form on our website."),
    ("any-other-size", [
        "For any other Metric or Imperial size not mentioned in catalogue or any other material combination of Seal ring and Energizer O-ring please contact ROYAL at info@royalcomposites.co.in",
    ], "For any other metric or imperial size, or any other material combination of seal ring and energizer O-ring, please use the enquiry form on our website."),
    ("all-metric", [
        "We have given all metric(mm) sizes here.",
    ], "All metric (mm) sizes are listed here."),
    ("no-pressure-build", [
        "No pressure build-up between seal and wiper",
    ], "No pressure build-up between seal and wiper."),
    ("edges", [
        "All edges should be smooth and burr free.",
    ], "All edges should be smooth and free of burrs."),
    ("edges-housing", [
        "All edges should be smooth HOUSING DESIGN {SERIES} and burr free.",
    ], "Housing design {SERIES}: all edges should be smooth and free of burrs."),
    ("eccentricity", [
        "FOR Ø B Refer to Maximum permissible gap ( S ) table considering the eccentricity of operating condition",
    ], "For dimension B, refer to the maximum permissible gap (S) table, which takes eccentricity under operating conditions into account."),
    ("extrusion-gap-dia", [
        "Extrusion Gap as per Dia B in dimension table on next page.",
    ], "Extrusion gap as per diameter B in the dimension table on the next page."),
    ("piston-two", [
        "Piston seal profile {SERIES} consists of two piece seal set for sealing pistons with one seal ring and one energizer O-ring.",
        "Piston seal profile {SERIES} consists of two piece seal set for sealing pistons with one seal ring and one NBR",
    ], "{SERIES} piston seal is a two-piece set for sealing pistons, with one seal ring and one energizer O-ring."),
    ("piston-square-pu", [
        "Piston seal profile {SERIES} consists of two piece seal set for sealing pistons with one seal ring and one square/ rectangular energizer",
    ], "{SERIES} piston seal is a two-piece set for sealing pistons, with one seal ring and one square or rectangular energizer."),
    ("piston-three-quad", [
        "Piston seal profile {SERIES} consists of three piece seal set for sealing pistons with one seal ring having a NBR quad ring",
    ], "{SERIES} piston seal is a three-piece set for sealing pistons, with one seal ring having an NBR quad ring."),
    ("piston-five", [
        "Piston seal profile {SERIES} consists of five piece seal set for sealing pistons with one elastomer seal ring, two back-up support",
        "Piston seal profile {SERIES} consists of five piece seal set for sealing pistons with one elastomer sealing component, two",
    ], "{SERIES} piston seal is a five-piece set for sealing pistons, with one elastomer seal ring and two back-up support components."),
    ("piston-four", [
        "Piston seal profile {SERIES} consists of four piece seal set with one main sealing component, one T shaped energizer ring and two anti-extrusion ring which support the seal on both sides and prevent extrusion of main seal ring.",
    ], "{SERIES} piston seal is a four-piece set: one main sealing component, one T-shaped energizer ring and two anti-extrusion rings. The anti-extrusion rings support the seal on both sides and prevent extrusion of the main seal ring."),
    ("piston-ucup", [
        "Piston seal profile {SERIES} is a single acting U cup type seal which has a very good static and dynamic tightness.",
    ], "{SERIES} piston seal is a single-acting U-cup seal with very good static and dynamic sealing."),
    ("piston-chevron", [
        "Pistons seal profile {SERIES} is a seal set consist of one or more chevron ring with a header and pressure ring.",
    ], "{SERIES} piston seal is a set of one or more chevron rings with a header and a pressure ring."),
    ("piston-polyurethane", [
        "Piston seal profile {SERIES} consists of one polyurethane / polyester seal ring energized with one NBR 'O' ring.",
    ], "{SERIES} piston seal is one polyurethane or polyester seal ring, energised by one NBR O-ring."),
    ("piston-pu-lip", [
        "Piston seal {SERIES} is a U cup type piston seal made of highly abrasion resistant polyurethane having very thin outer contact lip suitable for low pressure pneumatic application.",
    ], "{SERIES} piston seal is a U-cup seal made of highly abrasion-resistant polyurethane, with a very thin outer contact lip. It is suitable for low-pressure pneumatic applications."),
    ("rod-pu-lip", [
        "Rod seal {SERIES} is a U cup type rod seal made of highly abrasion resistant polyurethane having two very thin inner contact lip suitable for low pressure pneumatic application.",
    ], "{SERIES} rod seal is a U-cup seal made of highly abrasion-resistant polyurethane, with two very thin inner contact lips. It is suitable for low-pressure pneumatic applications."),
    ("rod-cum-wiper", [
        "This design is used as rod cum wiper seal for many pneumatic applications.",
    ], "This design is used as a combined rod seal and wiper for many pneumatic applications."),
    ("ss-oval", [
        "{SERIES} is a combination of split glass filled polyamide seal ring along with NBR Oval Energizer.",
    ], "{SERIES} combines a split glass-filled polyamide seal ring with an NBR oval energizer."),
    ("ss-square", [
        "{SERIES} is a combination of split glass filled polyamide seal ring along with NBR square energizer ring.",
    ], "{SERIES} combines a split glass-filled polyamide seal ring with an NBR square energizer ring."),
    ("ss-square-rect", [
        "{SERIES} is a combination of split glass filled polyamide seal ring along with NBR Square/Rectangular energizer ring.",
        "{SERIES} is a combination of split glass filled polyamide seal ring along with NBR Square/Rectangular energizer",
    ], "{SERIES} combines a split glass-filled polyamide seal ring with an NBR square or rectangular energizer ring."),
    ("split-oval", [
        "The split polyamide ring is then carefully placed on the piston above the Oval Ring.",
        "The split polyamide ring is then carefully plased on the piston above the Oval Ring.",
    ], "The split polyamide ring is then carefully fitted to the piston above the oval ring."),
    ("split-square", [
        "The split polyamide ring is then carefully placed on the piston above the Square Ring.",
    ], "The split polyamide ring is then carefully fitted to the piston above the square ring."),
    ("polyamide-square", [
        "The polyamide ring is then carefully placed on the piston above the Square Ring.",
    ], "The polyamide ring is then carefully fitted to the piston above the square ring."),
    ("double-acting", [
        "The seal can be used for double acting applications by fitting back to back in separate grooves.",
    ], "For double-acting applications, fit two seals back to back in separate grooves."),
    ("outer-lip", [
        "The outer dynamic lip is more robust to provide improved sealing and compression set characteristics.",
    ], "The outer dynamic lip is more robust, giving improved sealing and compression set characteristics."),
    ("single-ucup-both", [
        "{SERIES} is a single acting U cup type seal used for both piston and rod seal.",
    ], "{SERIES} is a single-acting U-cup seal used for both piston and rod sealing."),
    ("ps-single-piece", [
        "{SERIES} piston seals can be fitted on single-piece pistons.",
    ], "{SERIES} piston seals can be fitted to single-piece pistons."),
    ("snap-in", [
        "Snap in fitting through a kidney-shaped distortion.",
    ], "Snap-in fitting is done by distorting the ring into a kidney shape."),
    ("assembly-tool", [
        "An assembly tool eases installation of small, PTFE rings.",
    ], "An assembly tool makes it easier to fit small PTFE rings."),
    ("ptfe-return", [
        "The PTFE seal normally returns to its original size after installation.",
    ], "A PTFE seal normally returns to its original size after installation."),
    ("ptfe-push", [
        "The PTFE ring is then carefully pushed over the piston into place above the O Ring.",
    ], "The PTFE ring is then carefully pushed over the piston into place above the O-ring."),
    ("oring-first-housing", [
        "First insert the rubber O Ring into the housing carefully to avoid twisting of Ring.",
    ], "Fit the rubber O-ring into the housing carefully to avoid twisting."),
    ("square-first-housing", [
        "First insert the rubber Square Ring into the housing carefully to avoid twisting of Ring.",
        "First insert the rubber Square / Rectangular ring into the housing carefully to avoid twisting",
    ], "Fit the rubber square or rectangular ring into the housing carefully to avoid twisting."),
    ("oring-then-ptfe", [
        "Insert the O ring first and then turn the PTFE part in kidney shape and insert in the groove.",
    ], "Fit the O-ring first, then bend the PTFE part into a kidney shape and insert it into the groove."),
    ("square-then-ptfe", [
        "Insert the Square / Rectangular ring. first and then turn the PTFE part in kidney shape and insert in the groove.",
    ], "Fit the square or rectangular ring first, then bend the PTFE part into a kidney shape and insert it into the groove."),
    ("oring-then-pu", [
        "Insert the O ring first and then turn the PU part in kidney shape and insert in the groove.",
    ], "Fit the O-ring first, then bend the PU part into a kidney shape and insert it into the groove."),
    ("install-ptfe-fixture-quad", [
        "Install the PTFE part carefully with fixture and then place the quad ring on the groove over PTFE part.",
    ], "Fit the PTFE part carefully using a fixture, then place the quad ring in the groove over the PTFE part."),
    ("install-ptfe-fixture", [
        "Install the PTFE part carefully with fixture.",
    ], "Fit the PTFE part carefully using a fixture."),
    ("install-pu-oring", [
        "Install the Polyurethane / polyester part carefully over the O ring.",
    ], "Fit the polyurethane or polyester part carefully over the O-ring."),
    ("install-ptfe-oring", [
        "Install the PTFE part carefully over the O ring.",
    ], "Fit the PTFE part carefully over the O-ring."),
    ("calibrate-ptfe", [
        "It is advisable to calibrate the PTFE ring by mounting it on a steel tube (duly machined and polished), having Inner diameter equal to cylinder bore diameter.",
    ], "Calibrate the PTFE ring by mounting it on a machined and polished steel tube with an inner diameter equal to the cylinder bore diameter."),
    ("calibrate-install", [
        "Immediately after calibration, the piston should be installed in the cylinder.",
    ], "Install the piston in the cylinder immediately after calibration."),
    ("wiper-circlip", [
        "Wiper seal {SERIES} are pressed in to open housings with locking circlip.",
    ], "{SERIES} wiper seals are pressed into open housings and held by a locking circlip."),
    ("wiper-pressed", [
        "Wiper seal {SERIES} are pressed in to open housings.",
    ], "{SERIES} wiper seals are pressed into open housings."),
    ("wiper-single-integral", [
        "Wiper seal {SERIES} is a single acting rod wiper for integral housing.",
    ], "{SERIES} is a single-acting rod wiper for integral housings."),
    ("wiper-single-dust", [
        "Wiper seal {SERIES} is a single acting rod wiper for integral housing with extermal dust protecting lip",
    ], "{SERIES} is a single-acting rod wiper for integral housings, with an external dust-protecting lip."),
    ("wiper-double-integral", [
        "Wiper seal {SERIES} is a double acting rod wiper for integral housing.",
    ], "{SERIES} is a double-acting rod wiper for integral housings."),
    ("wiper-single-metal", [
        "Wiper seal {SERIES} is a single acting rod wiper with metal casing for open housing.",
    ], "{SERIES} is a single-acting rod wiper with a metal casing for open housings."),
    ("wiper-double-metal", [
        "Wiper seal {SERIES} is a double acting rod wiper with metal casing for open housing.",
    ], "{SERIES} is a double-acting rod wiper with a metal casing for open housings."),
    ("wiper-ptfe-oring", [
        "Wiper seal profile {SERIES} consists of two piece seal set for wiping rod with one PTFE ring and one Energizer O-ring.",
    ], "{SERIES} wiper profile is a two-piece set for wiping the rod, with one PTFE ring and one energizer O-ring."),
    ("double-lip", [
        "The double lip wiper {SERIES} is preferably fitted in combination with rod seal {SERIES}.",
    ], "The double-lip wiper {SERIES} is best fitted together with rod seal {SERIES}."),
    ("pressure-hole", [
        "We recommend in any case a pressure release hole be provided in front of the double lip wiper in order to avoid pressure build-up between",
    ], "We recommend a pressure release hole in front of the double-lip wiper to prevent pressure build-up between the seals."),
    ("rod-oring", [
        "Rod seal profile {SERIES} consists of two piece seal set for sealing rod with one seal ring and one energizer O-ring.",
    ], "{SERIES} rod seal is a two-piece set for sealing the rod, with one seal ring and one energizer O-ring."),
    ("rod-pu-oring", [
        "Rod seal profile {SERIES} consists of two piece seal set for sealing rod with one polyurethane seal ring and one energizer O-",
    ], "{SERIES} rod seal is a two-piece set for sealing the rod, with one polyurethane seal ring and one energizer O-ring."),
    ("rod-square", [
        "Rod seal profile {SERIES} consists of two piece seal set for sealing rod with one seal ring and one energizer Square /",
    ], "{SERIES} rod seal is a two-piece set for sealing the rod, with one seal ring and one energizer square or rectangular ring."),
    ("rod-ucup-rib", [
        "Rod seal profile {SERIES} is a single acting U cup type seal with additional rib commonly in use.",
    ], "{SERIES} rod seal is a single-acting U-cup seal with an additional rib, commonly used."),
    ("rod-ucup", [
        "Rod seal profile {SERIES} is a single acting U cup type seal commonly in use.",
    ], "{SERIES} rod seal is a single-acting U-cup seal, commonly used."),
    ("rod-ucup-energizer", [
        "Rod seal profile {SERIES} is a single acting U cup type seal with energizer and anti extrusion polyamide ring for very high",
    ], "{SERIES} rod seal is a single-acting U-cup seal with an energizer and an anti-extrusion polyamide ring, for very high pressure applications."),
    ("rod-chevron", [
        "Rod seal profile {SERIES} is a seal set consist of five chevron ring (3 fabric reinforced and 2 rubber rings) or three chevron ring (2 fabric reinforced and 1 rubber ring) and a header and a pressure ring.",
    ], "{SERIES} rod seal is a chevron set: five chevron rings (three fabric-reinforced and two rubber) or three chevron rings (two fabric-reinforced and one rubber), with a header and a pressure ring."),
    ("rod-buffer", [
        "Rod seal profile {SERIES} consists of two piece seal set with one seal ring and one backup ring used as buffer seal",
    ], "{SERIES} rod seal is a two-piece set with one seal ring and one backup ring, used as a buffer seal."),
    ("cushion", [
        "Cushion seal {SERIES} is specially designed seal for cushioning in pneumatic cylinders made of very high",
    ], "{SERIES} cushion seal is specially designed for cushioning in pneumatic cylinders."),
    ("guide-wrfr", [
        "Guide ring WRFR is a pre-molded ring ready to the size.",
    ], "Guide ring WRFR is a pre-moulded ring, supplied ready to size."),
    ("guide-strip-load", [
        "The permissible load of the guide strip is calculated from the projected area multiplied by the permissible specific surface pressing.",
    ], "The permissible load on the guide strip is calculated from the projected area, multiplied by the permissible specific surface pressing."),
    ("max-speed-load", [
        "Maximum speed 5 m/s Load bearing capacity 15 N/mm² at 20 °C (permitted specific surface pressing*)",
    ], "Maximum speed 5 m/s. Load-bearing capacity 15 N/mm² at 20 °C (permitted specific surface pressing*)."),
    ("roughness", [
        "Roughness depth R(max) Ra Sliding surface  2.5 µm 0.05-0.3 µm Bottom of groove  6.3 µm  1.6 µm Side of groove  15 µm  3µm",
    ], "Roughness depth R(max) and Ra: sliding surface 2.5 µm and 0.05-0.3 µm; bottom of groove 6.3 µm and 1.6 µm; side of groove 15 µm and 3 µm."),
    ("oring-intro", [
        "O-Rings are ring shaped seals of circular cross section.",
    ], "O-rings are ring-shaped seals with a circular cross-section."),
    ("oring-static", [
        "They are mainly used to seal machined components-in static situations - against fluid and gaseous media.",
    ], "They are mainly used to seal machined components in static situations, against fluid and gaseous media."),
    ("oring-dynamic", [
        "In certain conditions, they can be used as a dynamic sealing element for axial, rotating and oscillating movement.",
    ], "In certain conditions, they can be used as a dynamic seal for axial, rotating and oscillating movement."),
    ("oring-size-pu", [
        "For O ring size list in Polyurethane ask ROYAL at info@royalcomposites.co.in / info@royalseals.co.in",
    ], "For the O-ring size list in polyurethane, please use the enquiry form on our website."),
    ("backup-rect", [
        "Standard backup element with rectangular cross section.",
    ], "Standard backup element with a rectangular cross-section."),
    ("backup-gap", [
        "Backup element to prevent gap extrusion of radially sealing O-Rings and Rod seals in dynamic sealing.",
    ], "Backup element to prevent gap extrusion of radially sealing O-rings and rod seals in dynamic sealing."),
    ("recommendation", [
        "Above dimensions are just Recommendation.",
    ], "The dimensions above are recommendations only."),
    ("consider-application", [
        "Please consider actual Application before finalising Groove Diemnsions",
        "Please consider actual Application before finalising Groove Dimensions",
    ], "Please consider the actual application before finalising groove dimensions."),
    ("storage-intro", [
        "Storage When storing ROYAL seals, please check the following points:",
    ], "Storage: when storing seals, please check the following points:"),
    ("storage-1", [
        "Do not open the packing unnecessarily.",
    ], "Do not open the packing unnecessarily."),
    ("storage-1b", [
        "Dust may stick to the seal or scratch it.",
    ], "Dust can stick to the seal or scratch it."),
    ("storage-2", [
        "Avoid exposure to direct sunlight and store in a cool place.",
    ], "Avoid exposure to direct sunlight and store in a cool place."),
    ("storage-2b", [
        "Ultraviolet light and humidity may sometimes promote deterioration and dimensional change of rubber and resin materials.",
    ], "Ultraviolet light and humidity can sometimes cause deterioration and dimensional change in rubber and resin materials."),
    ("storage-3", [
        "When storing products already unpacked, be careful that foreign materials do not stick or become embedded.",
    ], "When storing unpacked products, take care that foreign material does not stick to them or become embedded in them."),
    ("storage-3b", [
        "Store them in their original condition, in tightly sealed poly to prevent dimensional change resulting from humidity.",
    ], "Keep them in their original packaging, in tightly sealed polythene, to prevent dimensional change caused by humidity."),
    ("storage-4", [
        "Do not place seals near any heat source such as a boiler, stove, oven etc.",
    ], "Do not place seals near any heat source, such as a boiler, stove or oven."),
    ("storage-4b", [
        "Heat may deteriorate the material.",
    ], "Heat can deteriorate the material."),
    ("storage-5", [
        "Do not place seals near electric motors or equipments generating ozone.",
    ], "Do not place seals near electric motors or equipment that generates ozone."),
    ("storage-6", [
        "Avoid hanging seals with a nail, wire or suspending them with a string as this may cause deformation and scratches on the top end of the lip.",
    ], "Do not hang seals on a nail or wire, or suspend them on string, as this can deform them and scratch the top end of the lip."),
    ("storage-7", [
        "Sometimes, colour changes or white powder appears on the surface of seals (blooming phenomenon).",
    ], "Colour changes or a white powder (blooming) sometimes appear on the surface of seals."),
    ("storage-7b", [
        "This will not affect the function of seal.",
    ], "This does not affect the function of the seal."),
    ("storage-8", [
        "PTFE rings of combination seals may be easily scratched if dropped or impacted by an external force.",
    ], "PTFE rings in combination seals can be easily scratched if dropped or struck."),
    ("storage-8b", [
        "Be careful when handling.",
    ], "Handle with care."),
    ("storage-9", [
        "The store room should be cool, dry and dust-free; it should have moderate ventilation.",
    ], "Store seals in a cool, dry, dust-free room with moderate ventilation."),
    ("storage-10", [
        "The seals should never be exposed to any ozone or ionizing radiation.",
    ], "Seals must never be exposed to ozone or ionising radiation."),
    ("check-intro", [
        "Check points before installation of seals:- ROYAL quality control methods for material and manufacturing processes ensure that all seals going into application field are in a condition capable of giving a long and reliable service life.",
    ], "Check points before installation of seals: quality control of materials and manufacturing processes ensures that all seals are in a condition capable of a long and reliable service life."),
    ("check-performance", [
        "Sealing performance of a seal is greatly influence by the method of assembling of a cylinder.",
    ], "The sealing performance of a seal is strongly influenced by how the cylinder is assembled."),
    ("check-recommend", [
        "On the basis of many years experience, to avoid premature seal failure the following recommendations should be considered at the design and manufacturing stage of the cylinder:",
    ], "Based on many years of experience, the following recommendations should be considered at the design and manufacturing stage of the cylinder to avoid premature seal failure:"),
    ("check-1", [
        "Specify piston and gland bearings which are adequately proportioned to support the cylinder loads.",
    ], "Specify piston and gland bearings that are adequately sized to support the cylinder loads."),
    ("check-1b", [
        "As a result of mounting misalignment and / or the working action of the cylinder, piston and gland bearings will be subjected to side loading, causing damage to the rod or the tube surface and hence the seal, if the bearings are inadequate.",
    ], "Mounting misalignment and/or the working action of the cylinder subjects piston and gland bearings to side loading. If the bearings are inadequate, this can damage the rod or tube surface and therefore the seal."),
    ("check-2", [
        "Check that the seal housing is free from damage likely to harm the seal.",
    ], "Check that the seal housing is free from damage that could harm the seal."),
    ("check-2b", [
        "Remove all sharp edges and burrs from metal parts, paying particular attention to ports, grooves and threads over or through which the seal passes during assembly.",
    ], "Remove all sharp edges and burrs from metal parts, paying particular attention to ports, grooves and threads over or through which the seal passes during assembly."),
    ("check-3", [
        "Clean all seal housing areas, ensuring that all metallic particles and other contaminants have been removed.",
    ], "Clean all seal housing areas, ensuring that all metal particles and other contaminants have been removed."),
    ("check-3b", [
        "Check that other surfaces adjacent to the passage of the seal on fitting are also free of dirt or other contaminants.",
    ], "Check that other surfaces the seal passes over during fitting are also free of dirt and contaminants."),
    ("check-3c", [
        "Check that both static and dynamic housing surface finishes meet specifications.",
    ], "Check that both static and dynamic housing surface finishes meet the specification."),
    ("check-4", [
        "Where the difference between a thread diameter over which the seal must pass and the seal diameter is small, use some form of protection over the thread, such as a fitting sleeve made of hard plastic.",
    ], "Where the difference between the thread diameter the seal must pass over and the seal diameter is small, protect the thread, for example with a fitting sleeve made of hard plastic."),
    ("check-5", [
        "Lubricate all seals and metal components liberally with clean operating fluid or a compatible grease prior to assembly.",
    ], "Lubricate all seals and metal components liberally with clean operating fluid or a compatible grease before assembly."),
    ("check-5b", [
        "Note that silicone grease should not be used in normal hydraulic applications.",
    ], "Note that silicone grease should not be used in standard hydraulic applications."),
    ("check-6", [
        "Where seals fitted to sub-assemblies, such as pistons, are awaiting further fitting operations, ensure that the seals are not subjected to any misaligned or localized loading which will cause local deformation.",
    ], "Where seals are fitted to sub-assemblies, such as pistons, that are waiting for further fitting, make sure the seals are not subjected to misaligned or localised loading that could cause local deformation."),
    ("check-6b", [
        "Ensure that sub-assemblies remain clean.",
    ], "Keep sub-assemblies clean."),
    ("check-7", [
        "The use of metal levers is not recommended but should they be used it is imperative that they are completely smooth and free from nicks and burrs.",
    ], "The use of metal levers is not recommended. If they are used, they must be completely smooth and free from nicks and burrs."),
    ("check-7b", [
        "When using them ensure that the metal surfaces adjacent to the seal are not damaged.",
    ], "When using them, make sure the metal surfaces next to the seal are not damaged."),
    ("check-8", [
        "Make sure that hydraulic cylinder & system is free from dust, any burr or steel particle.",
    ], "Make sure the hydraulic cylinder and system are free from dust, burrs and steel particles."),
        ("gauge-taper", [
            "Gauge the seal by a taper rod type fixture.",
        ], "Gauge the seal using a taper-rod fixture."),
        ("nonlinear-contact", [
            "The non linear contact pressure distribution, produces by the load with relation to temperature and tolerances, is taken into account in the value of the permissible load.",
        ], "The non-linear contact pressure distribution, caused by the load in relation to temperature and tolerances, is taken into account in the permissible load value."),
        ("s-min", [
            "The radial clearance S min controls the minimum metal to metal clearance between the gland and rod or bore and piston.",
        ], "The minimum radial clearance S controls the minimum metal-to-metal clearance between the gland and rod, or between the bore and piston."),
        ("s-max", [
            "S max control the maximum extrusion gap seen by a seal associated with the guide ring.",
        ], "S max controls the maximum extrusion gap seen by a seal used with the guide ring."),
        ("s-guidelines", [
            "The radial clearance S and the given tolerances are guidelines.",
        ], "The radial clearance S and the tolerances given are guidelines only."),
        ("guide-design", [
            "Use of the guide and tolerances are to be designed in accordance with the used seal.",
        ], "The guide and tolerances should be designed in accordance with the seal used."),
        ("s-reference", [
            "The radial clearance S given in the table of dimensions is to be seen exclusively as reference to the guide ring.",
        ], "The radial clearance S given in the dimension table is for reference to the guide ring only."),
        ("housing-adjust", [
            "The corresponding diameter of the seal housing is to be adjusted to the sealing component.",
        ], "The corresponding diameter of the seal housing should be adjusted to the sealing component."),
        ("cut-gap-z", [
            "The cut gap ' Z' arising after fitting of guide ring is necessary to compensate the thermal expansion of polymer",
        ], "The cut gap 'Z' that arises after fitting the guide ring is needed to compensate for the thermal expansion of the polymer."),
        ("rod-buffer-before", [
            "Rod seal profile {SERIES} consists of two piece seal set with one seal ring and one backup ring used as buffer seal before Royal {SERIES}, {SERIES}, {SERIES}.",
        ], "{SERIES} rod seal is a two-piece set with one seal ring and one backup ring, used as a buffer seal before {SERIES}, {SERIES} and {SERIES}."),
            ("piston-five-elastomer", [
                "Piston seal profile {SERIES} consists of five piece seal set for sealing pistons with one elastomer sealing component, two support rings and two anti-extrusion rings.",
            ], "The {SERIES} piston seal profile consists of a five-piece set for sealing pistons: one elastomer sealing component, two support rings and two anti-extrusion rings."),
            ("piston-two-oval", [
                "Piston seal profile {SERIES} consists of two piece seal set for sealing pistons with one seal ring and one energizer Oval- ring.",
            ], "The {SERIES} piston seal profile consists of a two-piece set for sealing pistons, with one seal ring and one oval-ring energizer."),
            ("clearance-gland-shaft", [
                "Figures show the maximum radial clearance on each side using maximum gland bush groove inner dia and minimum shaft dia considering respective tolerances.",
            ], "Figures show the maximum radial clearance on each side, based on the maximum gland bush groove inner diameter and the minimum shaft diameter, including the respective tolerances."),
            ("piston-five-guide", [
                "Piston seal profile {SERIES} consists of five piece seal set for sealing pistons with one elastomer seal ring, two back-up support rings and two L-shape guide rings.",
            ], "The {SERIES} piston seal profile consists of a five-piece set for sealing pistons: one elastomer seal ring, two backup support rings and two L-shaped guide rings."),
            ("ptfe-push-square", [
                "The PTFE ring is then carefully pushed over the piston into place above the Square / Rectangular ring.",
            ], "The PTFE ring is then carefully pushed over the piston and into place above the square or rectangular ring."),
            ("oring-first-oval", [
                "First insert the rubber Oval Ring into the housing carefully to avoid twisting of Oval Ring Cord.",
            ], "Fit the rubber oval ring into the housing carefully to avoid twisting the oval ring cord."),
            ("pu-push-square", [
                "The polyurethane ring is then carefully pushed over the piston into place above the Square / Rectangular ring.",
            ], "The polyurethane ring is then carefully pushed over the piston and into place above the square or rectangular ring."),
            ("pu-return", [
                "The polyurethane seal normally returns to its original size after installation.",
            ], "A polyurethane seal normally returns to its original size after installation."),
            ("piston-three-quad", [
                "Piston seal profile {SERIES} consists of three piece seal set for sealing pistons with one seal ring having a NBR quad ring installad on face groove and one energizer O-ring.",
            ], "The {SERIES} piston seal profile consists of a three-piece set for sealing pistons, with one seal ring, an NBR quad ring fitted in the face groove, and one O-ring energizer."),
            ("clearance-piston-one-side", [
                "Figures show the maximum radial clearance on one side using the minimum piston OD and max bore Ø considering respective tolerances.",
            ], "Figures show the maximum radial clearance on one side, based on the minimum piston OD and maximum bore Ø, including the respective tolerances."),
            ("single-ucup-oring", [
                "{SERIES} is a single acting U cup type seal with O ring energizer used for both piston and rod seal.",
            ], "{SERIES} is a single-acting U-cup seal with an O-ring energizer, used for both piston and rod sealing."),
            ("rod-ucup-polyamide", [
                "Rod seal profile {SERIES} is a single acting U cup type seal with energizer and anti extrusion polyamide ring for very high pressure and heavy duty application.",
            ], "The {SERIES} rod seal profile is a single-acting U-cup seal with an energizer and an anti-extrusion polyamide ring, for very high pressure and heavy-duty applications."),
            ("rod-square-energizer", [
                "Rod seal profile {SERIES} consists of two piece seal set for sealing rod with one seal ring and one energizer Square / Rectangular ring.",
            ], "The {SERIES} rod seal profile consists of a two-piece set for sealing rods, with one seal ring and one energizer, which is a square or rectangular ring."),
            ("rotary-piston-bore-oring", [
                "Rotary piston seal profile {SERIES} consists of two piece seal set for sealing bore with one seal ring and one energizer O-ring.",
            ], "The {SERIES} rotary piston seal profile consists of a two-piece set for sealing bores, with one seal ring and one O-ring energizer."),
            ("clearance-tube-shaft-groove", [
                "Figures show the maximum radial clearance on each side using minimum OD on shaft groove and maximum tube bore Ø considering respective tolerances.",
            ], "Figures show the maximum radial clearance on each side, based on the minimum OD of the shaft groove and the maximum tube bore Ø, including the respective tolerances."),
            ("rotary-single-piece", [
                "{SERIES} rotary piston seals can be fitted on single-piece pistons.",
            ], "{SERIES} rotary piston seals can be fitted to single-piece pistons."),
            ("ptfe-push-shaft", [
                "The PTFE ring is then carefully pushed over the shaft into place above the O Ring.",
            ], "The PTFE ring is then carefully pushed over the shaft and into place above the O-ring."),
            ("calibrate-ptfe-housing", [
                "It is advisable to calibrate the PTFE ring by mounting it on a steel tube (duly machined and polished), having inner diameter equal to housing inner diameter.",
            ], "Calibrate the PTFE ring by mounting it on a machined and polished steel tube with an inner diameter equal to the housing inner diameter."),
            ("calibrate-install-shaft", [
                "Immediately after calibration, the shaft should be installed to the housing body",
            ], "Install the shaft in the housing body immediately after calibration."),
            ("rotary-seal-shaft-oring", [
                "Rotary seal profile {SERIES} consists of two piece seal set for sealing shaft with one seal ring and one energizer O-ring.",
            ], "The {SERIES} rotary seal profile consists of a two-piece set for sealing shafts, with one seal ring and one O-ring energizer."),
            ("rotary-single-piece-seal", [
                "Rotary seal profile {SERIES} is a single piece seal commonly in use.",
            ], "The {SERIES} rotary seal profile is a single-piece seal, commonly used."),
            ("cushion-seal", [
                "Cushion seal {SERIES} is specially designed seal for cushioning in pneumatic cylinders made of very high abrasion resistant polyurethane.",
            ], "{SERIES} cushion seals are specially designed for cushioning in pneumatic cylinders. They are made of very high abrasion-resistant polyurethane."),
            ("careful-guide-ring", [
                "Fitting is prerequisite for perfect functioning of the guide ring.",
            ], "Careful fitting is essential for the guide ring to perform correctly."),
            ("careful-backup-ring", [
                "Careful fitting is prerequisite for perfect functioning of the backup ring.",
            ], "Careful fitting is essential for the backup ring to perform correctly."),
            ("piston-two-nbr-square", [
                "Piston seal profile {SERIES} consists of two piece seal set for sealing pistons with one seal ring and one NBR square/rectangular energizer ring.",
            ], "The {SERIES} piston seal profile consists of a two-piece set for sealing pistons, with one seal ring and one NBR energizer, which is a square or rectangular ring."),
            ("piston-two-polyester-square", [
                "Piston seal profile {SERIES} consists of two piece seal set for sealing pistons with one polyestar seal ring and one energizer square ring.",
            ], "The {SERIES} piston seal profile consists of a two-piece set for sealing pistons, with one polyester seal ring and one energizer, which is a square ring."),
            ("piston-two-modified-ptfe", [
                "Piston seal profile {SERIES} consists of two piece seal set for sealing pistons with one modified PTFE seal ring and one NBR 'O' ring as energizer.",
            ], "The {SERIES} piston seal profile consists of a two-piece set for sealing pistons, with one modified PTFE seal ring and one NBR O-ring as the energizer."),
            ]

    # Whole-line captions and labels that are matched exactly (after norm).
LINE_CANON_RAW = {
    "Homopolymer Copolymer": "Homopolymer and copolymer",
    "Maximum permissible gap dimension (s) for Metric sizes (mm)": "Maximum permissible gap dimension (S) for metric sizes (mm)",
    "Maximum permissible gap dimension (s) for Imperial sizes (inch)": "Maximum permissible gap dimension (S) for imperial sizes (inch)",
    "Maximum permissible gap (S) for Metric Sizes (mm)": "Maximum permissible gap (S) for metric sizes (mm)",
    "Maximum permissible gap (S) for Imperial Sizes (inch)": "Maximum permissible gap (S) for imperial sizes (inch)",
    "(Min / Max)": "(Min / Max)",
    "Maximum permissible gap dimension (s)": "Maximum permissible gap dimension (S)",
    "Roughness depth R(max) Ra": "Roughness depth R(max) Ra",
    "Housing Tolerance Chart in Metric size (mm)": "Housing tolerance chart, metric sizes (mm)",
    "Housing Tolerance Chart in Imperial size (inch)": "Housing tolerance chart, imperial sizes (inch)",
}

FRAG = {
    "Low friction, free of stick slip": "Low friction, free of stick-slip",
    "Low friction, free of stick-slip": "Low friction, free of stick-slip",
    "High abrasion resistance": "High abrasion resistance",
    "Dampers": "Dampers",
    "Wide temperature Range": "Wide temperature range",
    "Piston Accumulators": "Piston accumulators",
    "Mobile Hydraulics": "Mobile hydraulics",
    "Injection moulding machines": "Injection moulding machines",
    "Machine tools": "Machine tools",
    "Material Handling Equipments": "Material handling equipment",
    "Good thermal conductivity": "Good thermal conductivity",
    "Control and regulating apparatus": "Control and regulating apparatus",
    "Wide fluid application range": "Wide fluid application range",
    "Low friction, free of stick slip": "Low friction, free of stick-slip",
    "High abrasion resistance": "High abrasion resistance",
    "Suitable for dual media like nitrogen on one side and hydraulic oil on another side": "Suitable for dual media, with nitrogen on one side and hydraulic oil on the other",
    "For Hydro pneumatic cylinders one side and hydraulic oil on another side": "For hydropneumatic cylinders",
    "Good thermal conductivity": "Good thermal conductivity",
    "Less space required for seal and guide elements": "Less space required for seal and guide elements",
    "Prevents distortion inside the groove": "Prevents distortion inside the groove",
    "Single Piece Piston": "Single-piece piston",
    "Single Piece Piston with one groove": "Single-piece piston with one groove",
    "Mobile Hydraulics": "Mobile hydraulics",
    "Injection moulding machines": "Injection moulding machines",
    "Injection molding machines": "Injection moulding machines",
    "Machine tools": "Machine tools",
    "Piston Accumulator": "Piston accumulators",
    "Piston Accumulators": "Piston accumulators",
    "Agricultural equipments": "Agricultural equipment",
    "Material Handling Equipments": "Material handling equipment",
    "Low wear and high extrusion resistance": "Low wear and high extrusion resistance",
    "Wide fluid application range": "Wide fluid application range",
    "Easy installation": "Easy installation",
    "Additional rib prevents ingress of dirt to a large degree": "Additional rib largely prevents ingress of dirt",
    "Double acting": "Double-acting",
    "Allow large radial gaps due to backup rings": "Allows large radial gaps due to backup rings",
    "Very good extrusion reliability": "Very good extrusion reliability",
    "High resistance to extrusion due to fabric reinforced header ring": "High resistance to extrusion, thanks to the fabric-reinforced header ring",
    "Excellent sealing effect": "Excellent sealing effect",
    "Perfect sealing effect": "Excellent sealing effect",
    "Suitable for very low to high pressure": "Suitable for very low to high pressure",
    "Used as piston seal & rod seal": "Used as piston and rod seal",
    "Anti-extrusion ring prevent extrusion in high pressure": "Anti-extrusion ring prevents extrusion at high pressure",
    "Minimum contact friction": "Minimum contact friction",
    "High resistance to abrasion": "High resistance to abrasion",
    "Low wear": "Low wear",
    "Minimum installation space required": "Minimum installation space required",
    "Standard cylinders": "Standard cylinders",
    "Standard Cylinder": "Standard cylinders",
    "Resistance against cold flow": "Resistance to cold flow",
    "Very good wiping action": "Very good wiping action",
    "Presses, fork lift & material handling equipments": "Presses, forklift and material handling equipment",
    "Presses, fork lift & material handling": "Presses, forklift and material handling equipment",
    "Control and regulating apparatus": "Control and regulating apparatus",
    "Easy snap in installation": "Easy snap-in installation",
    "Wiper can be used for a broad temperature range": "Wiper suitable for a broad temperature range",
    "No pressure build-up between seal and wiper": "No pressure build-up between seal and wiper",
    "No extrusion into the radial sealing gap": "No extrusion into the radial sealing gap",
    "Wiper can be used for a broad temperature range with different materials": "Wiper suitable for a broad temperature range, in different materials",
    "Mining & construction machineries": "Mining and construction machinery",
    "Suitable for rapid energisation": "Suitable for rapid energisation",
    "Sealing component protected against twisting": "Sealing component protected against twisting",
    "Zero leakage": "Zero leakage",
    "Long working life in extreme conditions": "Long working life in extreme conditions",
    "hydraulic presses": "Hydraulic presses",
    "iron and steel industry": "Iron and steel industry",
    "marine hydraulics": "Marine hydraulics",
    "Rotary joints": "Rotary joints",
    "Low friction due to thin outer lip": "Low friction due to thin outer lip",
    "Pneumatics tools & equipments": "Pneumatic tools and equipment",
    "High contact pressure through rubber profile ring": "High contact pressure through rubber profile ring",
    "Excellent sealing function": "Excellent sealing function",
    "Where Piston is Passing above an oil port": "Where the piston passes over an oil port",
    "Suitable for dual media like nitrogen on one side and hydraulic oil on another side": "Suitable for dual media, with nitrogen on one side and hydraulic oil on the other",
    "Suitable for dual media like nitrogen on": "Suitable for dual media, with nitrogen on one side and hydraulic oil on the other",
    "For Hydro pneumatic cylinders": "For hydropneumatic cylinders",
    "High abrasion resistance ": "High abrasion resistance",
    "Construction Machineries": "Construction machinery",
    "Easy installation primary seal": "Easy installation of the primary seal",
    "No pressure built up between primary and secondary seal": "No pressure build-up between primary and secondary seal",
    "Least oil film release": "Least oil film release",
    "Very Easy Installation": "Very easy installation",
    "Easy push fit installation": "Easy push-fit installation",
    "For short stroke and high frequency": "For short stroke and high frequency",
    "Easy press fit installation in open housing": "Easy press-fit installation in open housing",
    "Easy press fit installation in open housing with locking circlip": "Easy press-fit installation in open housing with locking circlip",
    "Seal acts as a check valve": "Seal acts as a check valve",
    "Pneumatic tools & equipments": "Pneumatic tools and equipment",
    "High load bearing capacity": "High load-bearing capacity",
    "O ring can be used for both static and dynamic sealing application": "O-ring can be used for both static and dynamic sealing",
    "All short of hydraulic and pneumatic sealing system": "All types of hydraulic and pneumatic sealing system",
    "Sealing lips directed inwards gives both side wiping effect": "Sealing lips directed inwards give a wiping effect on both sides",
    "Rotary joints": "Rotary joints",
    "Presses, fork lift & material handling": "Presses, forklift and material handling equipment",
    "hydraulic presses ": "Hydraulic presses",
}

TEXT_FIXES = [
    (re.compile(r"[’‘]"), "'"),
    (re.compile(r"compounds\.\s*\(Section\s*-\s*III\)"), "compounds (Section III)"),
    (re.compile(r"\(Section\s*-\s*III\)"), "(Section III)"),
    (re.compile(r"table\s*:-"), "table:"),
    (re.compile(r"\s+:"), ":"),
]
STRUCT_FIXES = [
    (re.compile(r"ROYAL STANDARD SIZE LIST"), "STANDARD SIZE LIST"),
    (re.compile(r"Section (\w+) - Royal Seal Compounds"), r"Section \1 - Seal Compounds"),
    (re.compile(r"Section (\w+) - Royal Seal Profiles"), r"Section \1 - Seal Profiles"),
    (re.compile(r"\bRoyal Seal Profiles\b"), "Seal Profiles"),
    (re.compile(r"\bROYAL\b\s*"), ""),
    (re.compile(r"\bRoyal\b\s*"), ""),
]


def _ask_case(match):
    word = match.group(1)
    if word.isupper():
        return "ON ENQUIRY"
    if word[0].isupper():
        return "On enquiry"
    return "on enquiry"


TABLE_FIXES = [
    (re.compile(r"\b(ask|Ask|ASK) ROYAL\b"), _ask_case),
]
FORBIDDEN_RE = re.compile(r"royal|kolkata|royalcomposites|royalseals|info@|\ufffd|’|‘", re.I)


def norm(text):
    text = text.replace("{SERIES}", " series ")
    text = re.sub(r"[^a-z0-9 ]+", " ", text.lower())
    return " ".join(text.split())


KEY_TERMS = {
    "ptfe", "polyurethane", "polyamide", "nbr", "fkm", "pu", "guide", "backup",
    "wiper", "piston", "rod", "shaft", "bore", "tube", "energizer", "cushion",
    "oring", "oval", "square", "rectangular", "lip", "rotary", "metal", "single",
    "double", "one", "two", "three", "five", "piece", "ucup", "acting", "pressure",
    "bronze", "steel",
}


def key_terms(text):
    """Material and part words that must agree before a fuzzy match is accepted."""
    stems = {w[:-1] if w.endswith("s") else w for w in re.findall(r"[a-z]+", text.lower())}
    return stems & KEY_TERMS


CANON_VARIANTS = [
    (cid, [(norm(v), key_terms(v)) for v in variants], template)
    for cid, variants, template in CANON
]
FRAG_NORM = {norm(k): v for k, v in FRAG.items()}
LINE_CANON = {norm(k): v for k, v in LINE_CANON_RAW.items()}


def match(masked):
    key, terms = norm(masked), key_terms(masked)
    best_score, best = 0.0, None
    for cid, variants, template in CANON_VARIANTS:
        for variant, vterms in variants:
            if vterms != terms:
                continue
            score = difflib.SequenceMatcher(None, key, variant).ratio()
            if score > best_score:
                best_score, best = score, (cid, template)
    return best_score, best


def map_fragment(fragment):
    key = norm(fragment)
    if key in FRAG_NORM:
        return FRAG_NORM[key], 1.0
    close = difflib.get_close_matches(key, list(FRAG_NORM), n=1, cutoff=FRAG_THRESHOLD)
    if close:
        return FRAG_NORM[close[0]], difflib.SequenceMatcher(None, key, close[0]).ratio()
    return None, 0.0


def apply(patterns, text):
    for pattern, repl in patterns:
        text = pattern.sub(repl, text)
    return text


def split_sentences(text):
    return [s.strip() for s in SPLIT_RE.split(text) if s and s.strip()]


def render(template, codes):
    parts = template.split("{SERIES}")
    if len(parts) - 1 != len(codes):
        raise ValueError("series count mismatch")
    out = parts[0]
    for code, part in zip(codes, parts[1:]):
        out += code.upper() + part
    return out


def is_label(piece):
    if piece in ("Metric", "Imperial"):
        return True
    return len(piece.split()) <= 8 and piece.endswith(":") and not re.search(r"[.!?]\s", piece)


def is_heading(line):
    if len(line.split()) > 8 or line.endswith("."):
        return False
    return line.isupper() or bool(re.match(r"^(Section\s+[IVX]+\s*-|Royal\b|ROYAL\b)", line))


def classify(seg):
    """Return (kind, text, action, canonical_id, score, source).

    kind is one of: sentence, block, drop, fail.
    """
    tm = TEMP_RE.search(seg)
    if tm:
        return "sentence", f"Temperature range: {tm.group(1)}.", "TEMP_RANGE", "temp-range", 1.0, seg
    if EXAMPLE_RE.search(seg):
        return "drop", None, "DROP_EXAMPLE", "", 0.0, seg
    if CAPTION_PASS_RE.search(seg):
        return "block", seg, "CAPTION_PASS", "", 1.0, seg
    prefix = ""
    pm = NUMBER_PREFIX_RE.match(seg)
    if pm:
        prefix, seg = pm.group(1) + " ", pm.group(2)
    masked = SERIES_RE.sub("{SERIES}", seg)
    if not re.search(r"[a-z]", masked):
        return "block", prefix + apply(STRUCT_FIXES, seg), "STRUCT_CAPS", "", 1.0, seg
    key = norm(masked)
    if key in LINE_CANON:
        return "block", prefix + LINE_CANON[key], "CAPTION", "line-canon", 1.0, masked
    score, best = match(masked)
    if best is None or score < THRESHOLD:
        return "fail", f"[UNMAPPED: {masked}]", "UNMAPPED", "", score, masked
    cid, template = best
    try:
        text = render(template, SERIES_RE.findall(seg))
    except ValueError:
        return "fail", f"[UNMAPPED: {masked}]", "UNMAPPED_COUNT", cid, score, masked
    return "sentence", prefix + text, "REWRITE", cid, score, masked


class Output:
    def __init__(self):
        self.lines = []

    def _sep(self):
        if self.lines and self.lines[-1] != "":
            self.lines.append("")

    def block(self, text):
        self._sep()
        self.lines.append(text)
        self.lines.append("")

    def bullet(self, text):
        if not (self.lines and self.lines[-1].startswith("- ")):
            self._sep()
        self.lines.append(f"- {text}")

    def table(self, row):
        if not (self.lines and self.lines[-1].startswith("|")):
            self._sep()
        self.lines.append(row)

    def text(self):
        return "\n".join(self.lines).strip() + "\n"


def build(src_lines):
    out = Output()
    counts = Counter()
    rows = {}
    canon_used = set()
    buf = []
    para = []
    bullet_rows = []
    state = {"bullets": False}

    def record(key, action, cid, score, source):
        entry = rows.setdefault(key, {"action": action, "canonical": cid, "score": round(score, 3), "count": 0, "source": source})
        entry["count"] += 1
        counts[action] += 1
        if action == "REWRITE":
            canon_used.add(cid)

    def flush_para():
        if para:
            out.block(" ".join(para))
            para.clear()

    def flush_bullets():
        if not bullet_rows:
            return
        out._sep()
        for frags in bullet_rows:
            for fragment in frags:
                fragment = fragment.strip().rstrip(".")
                if not fragment:
                    continue
                mapped, score = map_fragment(fragment)
                if mapped is None:
                    record(f"FRAG_FAIL:{norm(fragment)}", "UNMAPPED_FRAG", "", 0.0, fragment)
                    out.bullet(f"[UNMAPPED: {fragment}]")
                else:
                    record(f"FRAG:{norm(fragment)}", "BULLET", "", score, fragment)
                    out.bullet(mapped)
        bullet_rows.clear()
        out.lines.append("")

    def flush_buf():
        if not buf:
            return
        text = apply(TEXT_FIXES, " ".join(buf))
        buf.clear()
        for seg in split_sentences(text):
            kind, value, action, cid, score, source = classify(seg)
            record(f"{action}:{cid}:{norm(source)[:80]}", action, cid, score, source)
            if kind == "sentence":
                if re.match(r"\d+\)", value):
                    flush_para()
                para.append(value)
            elif kind == "block":
                flush_para()
                out.block(value)
            elif kind == "fail":
                para.append(value)
        flush_para()

    blank = False
    for raw in src_lines:
        line = raw.strip()
        if END_MARKER_RE.match(line):
            counts["DROP_AUDIT_NOTE"] += 1
            break
        if not line:
            blank = True
            continue
        if PAGE_HEADING_RE.match(line) or PAGE_NO_RE.match(line) or line == RUNNING_HEADER:
            counts["DROP_PAGE_MARKER"] += 1
            blank = True
            continue
        if line.startswith("|"):
            flush_buf()
            flush_bullets()
            state["bullets"] = False
            out.table(apply(TABLE_FIXES, line))
            counts["TABLE_ROW"] += 1
            blank = False
            continue
        had_glyph = bool(re.match(r"[\uf000-\uf0ff]", line))
        line = re.sub(r"[\uf000-\uf0ff]", "  ", line).strip()
        if line.startswith("* "):
            line = line[2:].strip()
        tm = TABLE_MARKER_RE.match(line)
        if tm:
            flush_buf()
            flush_bullets()
            state["bullets"] = False
            if tm.group(1):
                buf.append(tm.group(1))
                flush_buf()
            out.block(f"**{tm.group(2)}**")
            counts["TABLE_MARKER"] += 1
            blank = False
            continue
        sm = SECTION_RE.match(line)
        if sm:
            flush_buf()
            flush_bullets()
            state["bullets"] = False
            out.block(f"### Section {sm.group(1)}")
            counts["HEADING"] += 1
            blank = False
            continue
        if line.startswith("#") or is_heading(line):
            flush_buf()
            flush_bullets()
            state["bullets"] = False
            out.block("### " + apply(STRUCT_FIXES, line.lstrip("#").strip()))
            counts["HEADING"] += 1
            blank = False
            continue
        for piece in [p.strip() for p in BULLET_SPLIT_RE.split(line) if p and p.strip()]:
            if BULLET_SPLIT_RE.fullmatch(piece):
                flush_buf()
                flush_bullets()
                out.block(apply(TEXT_FIXES, piece))
                state["bullets"] = True
                counts["LABEL"] += 1
                continue
            if is_label(piece):
                flush_buf()
                flush_bullets()
                state["bullets"] = False
                out.block(apply(STRUCT_FIXES, apply(TEXT_FIXES, piece)))
                counts["LABEL"] += 1
                continue
            if state["bullets"] and len(piece.split()) <= 14:
                if piece[:1].islower() and bullet_rows and not had_glyph:
                    bullet_rows[-1][0] += " " + piece
                    counts["BULLET_CONTINUATION"] += 1
                else:
                    flush_buf()
                    bullet_rows.append(re.split(r"\s{2,}", piece))
                continue
            flush_bullets()
            state["bullets"] = False
            if blank and buf and buf[-1][-1:] in ".:)" and piece[:1].isupper():
                flush_buf()
            buf.append(piece)
        blank = False

    flush_buf()
    flush_bullets()
    return out.text(), counts, rows, canon_used


def validate(src_lines, out_text, counts):
    failures = []
    out_lines = out_text.splitlines()
    if counts["UNMAPPED"] or counts["UNMAPPED_COUNT"] or counts["UNMAPPED_FRAG"]:
        failures.append(
            f"unmapped: sentences {counts['UNMAPPED'] + counts['UNMAPPED_COUNT']}, bullets {counts['UNMAPPED_FRAG']}"
        )
    bad = [line for line in out_lines if FORBIDDEN_RE.search(line)]
    if bad:
        failures.append(f"{len(bad)} line(s) contain Royal names, contact emails or mojibake; first: {bad[:2]}")
    src_rows = [apply(TABLE_FIXES, line.strip()) for line in src_lines if line.strip().startswith("|")]
    out_rows = [line for line in out_lines if line.startswith("|")]
    if src_rows != out_rows:
        failures.append(f"table rows differ from source (source {len(src_rows)}, output {len(out_rows)})")
    src_codes = set(SERIES_RE.findall("\n".join(src_lines)))
    out_codes = set(SERIES_RE.findall(out_text))
    extra = sorted(out_codes - src_codes)
    if extra:
        failures.append(f"output uses series codes not in source: {extra[:5]}")
    return failures


REVIEW_FLAGS = {
    "rod-buffer-before": (
        "RS063 rod seal 'used as buffer seal before RS027, RS036 and RS045' is ambiguous "
        "in the source; confirm the intended meaning against the supplier datasheet."
    ),
}


def main():
    src_text = SRC.read_text(encoding="utf-8")
    all_lines = src_text.splitlines()
    start = next(i for i, line in enumerate(all_lines) if line.startswith("## Page"))
    body = all_lines[start:]

    text, counts, rows, canon_used = build(body)
    review = []
    for entry in rows.values():
        if entry["canonical"] in REVIEW_FLAGS:
            entry["action"] = "REVIEW"
            review.append((entry["count"], REVIEW_FLAGS[entry["canonical"]]))
    header = (
        "# Seal catalogue body text (draft)\n\n"
        "Generated locally by scripts/build_duraforge_body.py. Draft for review. "
        "Not for publication until checked.\n\n"
    )
    full = header + text
    OUT.write_text(full, encoding="utf-8", newline="\n")

    with MAP.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["count", "action", "canonical_id", "score", "source_masked"])
        for entry in sorted(rows.values(), key=lambda e: (e["action"], -e["count"])):
            writer.writerow([entry["count"], entry["action"], entry["canonical"], entry["score"], entry["source"]])

    print(f"Actions: {dict(counts)}")
    print(f"Canonical sentences used: {len(canon_used)} of {len(CANON)}")
    for count, reason in review:
        print(f"REVIEW ({count}): {reason}")
    print(f"Written: {OUT}")
    print(f"Map: {MAP}")

    failures = validate(body, full, counts)
    if failures:
        print("VALIDATION FAILED:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("VALIDATION PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
