export type CatalogAssetType="تقني"|"طبي";
export type DeviceCatalogGroup={assetType:CatalogAssetType;category:string;devices:readonly string[]};

export const deviceCatalog=[
  {
    "assetType": "تقني",
    "category": "Engineering & Utilities",
    "devices": [
      "Battery 100 A",
      "Battery 140 A",
      "Battery 200 A",
      "Electrical Generator 200 KVA",
      "Electrical Generator 600 KVA",
      "Electrical Generator 800 KVA",
      "Online UPS 100KVA",
      "Online UPS 10KVA",
      "Online UPS 1KVA",
      "Online UPS 3KVA",
      "Online UPS 6KVA",
      "spare part for Electrical Generator",
      "spare part for Filtration station"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Anesthesia & Airway",
    "devices": [
      "Anesthesia Machine",
      "Blood warmer",
      "fiber optic Laryngoscope",
      "Laryngoscope",
      "Warmer Blanket"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Blood Bank Equipment",
    "devices": [
      "CBC Analyzer 5 Diff.",
      "Centrifuge",
      "Cryofuge(centrifuge for blood units)",
      "Deep Freezer -70C",
      "DONOR CHAIR",
      "Extractor (plasma expressor)",
      "Hand SEALING MACHINE",
      "mixer scale",
      "Platelet shaker with incubator",
      "REFRIGERATOR",
      "Semi-automated Grouping and Cross Matching system"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Diagnostic Imaging",
    "devices": [
      "C-arm Machine",
      "Digital Portable X-ray",
      "Handheld Ultrasound",
      "Ultrasound (Convex and Vaginal Probe)",
      "Ultrasound with( echo,convex and linear probe)"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Emergency & Resuscitation",
    "devices": [
      "Emergency Trolley",
      "Portable Pulse oximeter",
      "Portable suction",
      "Tourniquet"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Endoscopy & Laparoscopy",
    "devices": [
      "Endoscope unit with all fitting (ERCP,Bronchoscope)",
      "Laparoscope Unit (Cystoscopy with all fitting and instruments, Nephroscopy including PCNL,Ureteroscope )",
      "Laparoscope Unit with all fitting and instruments"
    ]
  },
  {
    "assetType": "طبي",
    "category": "ENT Equipment",
    "devices": [
      "ENT Set",
      "ENT Unit",
      "Head Light (E.N.T)",
      "ICU bed with all needs (Syringand infusion pump, Ventelators , CPAP, Patient Monitors with central station... etc)",
      "Mastoid drill with all fitting",
      "Otoscope",
      "Patient Bed",
      "Patient Monitor",
      "Patient transfer trolley",
      "Tympano-mastoidectomy set"
    ]
  },
  {
    "assetType": "طبي",
    "category": "General Medical Equipment",
    "devices": [
      "Cervical Exploration",
      "Dc shook",
      "Pterygium Set",
      "Refrigerator",
      "varicose vein set"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Histopathology Equipment",
    "devices": [
      "Analytical Balance",
      "Auto IHC stainer",
      "Automatic Slide Stainer",
      "Binocular microscopee",
      "Cryostat Microtome",
      "Cytocentrifuge",
      "Digital Incubator",
      "Dry Oven",
      "Embedding System",
      "Fume Hood",
      "Grossing Workstation",
      "Laboratory Centrifuge (12 Tubes",
      "pH Meter",
      "Rotary Microtome",
      "Slide Archiving Unit",
      "Tissue Processor",
      "Water Bath (Tissue Floater)"
    ]
  },
  {
    "assetType": "طبي",
    "category": "ICU & Respiratory Care",
    "devices": [
      "Air mattress",
      "Central Oxygen Flowmeter",
      "Central vacuum unit",
      "CPAP",
      "HF Ventilator",
      "Infusion pump with IV stand",
      "Nebulizer",
      "Syringe pump with IV stand"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Laboratory & Point-of-Care",
    "devices": [
      "Activated clotting time \"ACT\" machine",
      "Blood gas Analyzer \"ABGs\"",
      "Glucometer"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Laboratory Equipment",
    "devices": [
      "Autoclave",
      "Automated Chemistry Analyzer",
      "Automated Coagulation Analyzer",
      "CBC",
      "Centrifuge",
      "Cross Match system",
      "Electrolyte Analyzer",
      "Hormone Analyzer",
      "Incubator",
      "microscopee",
      "REFRIGERATOR 2-8 C",
      "Safety Cabinet",
      "Spectrophotometer",
      "Water Bath",
      "Water Distillator"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Medical Gas Systems",
    "devices": [
      "Oxygen Generator station 750L/min",
      "spare part for Oxygen Generator station"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Neonatal & Pediatric",
    "devices": [
      "Baby Cot",
      "Baby Warmer",
      "Bilirubin Meter",
      "Incubator",
      "UV Phototherapy"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Neurosurgery",
    "devices": [
      "Cervical Spine Set",
      "Craniotomy Set",
      "Discectomy & Laminectomy Set",
      "Electrical Neurosurgical Drill",
      "Neurosurgery Set",
      "Neurosurgical Drill Pneumatic",
      "Neurosurgical microscopee"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Obstetrics & Gynecology",
    "devices": [
      "C/S set",
      "Cerclage set",
      "CTG",
      "D&C set",
      "Electrical Delivery Bed",
      "T.A.H set"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Occupational Therapy Equipment",
    "devices": [
      "ADL training set",
      "Arm Skate",
      "Chair with Armrests",
      "Dressing aids",
      "E-Z Exerboard",
      "feeding aids",
      "Figure 8 Board System",
      "Foam Dexterity Board",
      "Graded Pinch Exerciser",
      "Horizontal Ring Tree",
      "Incline Board",
      "Physio Balls",
      "Prism Bricks",
      "Punch Revolving",
      "Sanding Unit for Reciprocal Exercise",
      "Shape Sorting Cube",
      "Small Mirror"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Operating Room Equipment",
    "devices": [
      "Ceiling surgical Light",
      "Electrosurgical unit (ESU)",
      "Examination light",
      "General Surgical Table",
      "Half-moon",
      "Harmonic",
      "Ligasure",
      "mayo stand",
      "portable Surgical light"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Ophthalmology Equipment",
    "devices": [
      "Argon laser for surgical vitrectomy",
      "Autokeratorefractometer",
      "Automated Visual field analyzer",
      "Backflush / flute needle – 23G",
      "Basket & magnatic forceps gauge 23 Basket & magnatic forceps gauge 18",
      "Big scissors straight for eye use",
      "Bimanual irrigation and aspiration gauge21",
      "Biometry with a and b scan",
      "Colibri forceps",
      "Conjunctiva forceps, straight",
      "Corneal topography",
      "Crocodile forceps gauge 23 titanium",
      "Cryo Machine",
      "DCR set",
      "Diamond brush 23 gauge",
      "Direct ophthalmoscope",
      "Endo forceps (ILM forceps, membrane peel forceps) – 23G",
      "Endo scissors (Vannas or curved micro scissors) – 23G",
      "EtO (ethylene oxide) sterilizer",
      "eye speculum,adj. mechanism",
      "FFA fundus camera machine",
      "Frames (for adult and children)",
      "General Ophthalmic Instruments for pkp: Lid speculum Fine-toothed forceps Colibri forceps McPherson forceps Vannas scissors Westcott scissors Needle holder Caliper Castroviejo caliper Instruments for Corneal Trephination: Corneal trephine Hessburg-Barron vacuum trephine Hanna trephine Donor corneal punch Donor punch block Vacuum trephine system",
      "Handheld Tonometer",
      "ILM forceps gauge23 titanium",
      "Indentor",
      "Indirect ophthalmoscope",
      "Intraocular Crocodile Forceps (Alligator Forceps) – 23G",
      "Intraocular magnetic forceps for foreign body removal – 18G",
      "Intraocular magnetic forceps for foreign body removal – 20G",
      "Lens Bar",
      "Lens meter",
      "Lid speculum",
      "Macular Irrigation lens",
      "Micro needle holder",
      "Needle holder small titanium",
      "Ophthalmic microscope ready for vitrectomy surgery with: - biome Qty. 3 - inverter Qty. 1 - Electrical filter laser Qty. 2",
      "ophthalmic surgeon chair",
      "Optical Biometry and Intraocular Lens (IOL) Power Calculation Device (IOL Master or equivalent)",
      "Optical coherence tomography angiography (OCTA)",
      "Perfluorocarbon liquid cannula",
      "Phaco +vitrectomy machine with: - phaco hand peice Qty. 20 - phaco surgical set Qty. 5 - vitrectomy set Qty. 3 - Sterilization Cassettes for phacoemulsification Qty. 500 - Sterilization Cassettes for Vitrectomy include(1-light 2-trocher 3-infusion canula 4-vitrectom ) Qty. 300 - vitrectomyforceps(ILM) g23 Qty. 5 - vitrectomyforceps(crocodil) g23 Qty. 3 - irrigation aspiration for phaco surgery Qty. 10pairs",
      "Prism par",
      "Projector",
      "Retinoscope",
      "scissors curved 90 degree titanium",
      "scissors Curved gauge 23 titanium",
      "Scissors IOL cutting gauge 23",
      "Scleral depressor",
      "Short mcpherson tying cvd",
      "Silicone oil injector / cannula",
      "Sinsky hook (dilar)titanium",
      "Slit lamp (with applanation tonometer)",
      "Soft-tip cannula – 23G",
      "Squint set",
      "Standard Vitrectomy Surgical Instrument Sets Set include:",
      "Sterilizing case",
      "Sub tenon canula metal",
      "Surgical set",
      "Surgical Table with ophthalmic accessory",
      "Tenotomy scissors",
      "Trial lens",
      "Tshoper double ended sharp end and blunt end titanium",
      "Tying forceps (Colibri, McPherson, cvd)",
      "X- linking machine",
      "Yag laser machine for anterior segment procedures"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Orthopedic Surgery",
    "devices": [
      "Air power Drill (power+Battery)",
      "DHS Set",
      "laparoscope system with ArthroScope Set and shaver with all fitting",
      "Orthopaedic Major Set",
      "Orthopaedic Minor Set",
      "Orthopedic Surgical table (DHS)",
      "Saw Drill"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Patient Care Furniture",
    "devices": [
      "Dressing Trolley",
      "Medication Trolley"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Patient Monitoring",
    "devices": [
      "ECG",
      "Vital sign monitor"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Physical Therapy Equipment",
    "devices": [
      "Adjustable Treatment Bed",
      "Ankle & Wrist Weights",
      "back orthosis",
      "Bolsters & Wedges",
      "Cold Packs",
      "Computer with Headphones",
      "Cuff Weights",
      "Dumbbells – Different Weights",
      "Electrical Stimulator",
      "Finger Ladder",
      "Foam Rollers",
      "Full-Length Mirror",
      "Gait Training Stairs",
      "Goniometer",
      "Hot Packs",
      "Hydrocollator",
      "lower limbs orthosis",
      "Massage Device",
      "Measuring Tape",
      "Multi-Gym",
      "Paediatric Standing Frame",
      "Parallel Bars with adjustable height",
      "Pedal Exerciser / Mini Cycle",
      "Pediatric Gait Trainer",
      "Physio Ball",
      "Portable ES (TENS)",
      "Quadriceps Bench",
      "Reflex Hammer",
      "Shoulder Pulley",
      "Standing Frame",
      "Stationary Bike",
      "Stopwatch",
      "Suspension Device",
      "Swiss Balls – Different Sizes",
      "Therapy Putty",
      "Tilting Table",
      "Traction Unit – Cervical & Lumbar",
      "Treadmill",
      "Treatment Mattress",
      "Tuning Fork",
      "Ultrasound for physiotherapy",
      "upper limbs orthosis",
      "vibration",
      "White Treatment Bed"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Radiology Equipment",
    "devices": [
      "basic x-ray",
      "Computed Radiography CR",
      "CT",
      "Mammography"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Speech & Language Therapy Equipment",
    "devices": [
      "Balloons",
      "Blocks",
      "Colored Pencils",
      "Colored Wooden Ring Game",
      "Computer with Headphones",
      "Difference Cards",
      "Electrical Stimulation Device",
      "Implicit Sets (Cards + Pictures): Actions",
      "Implicit Sets (Cards + Pictures): Adjectives",
      "Implicit Sets (Cards + Pictures): Animals",
      "Implicit Sets (Cards + Pictures): Birds",
      "Implicit Sets (Cards + Pictures): Body Parts",
      "Implicit Sets (Cards + Pictures): Clothes",
      "Implicit Sets (Cards + Pictures): Colors",
      "Implicit Sets (Cards + Pictures): Demonstrative Pronouns",
      "Implicit Sets (Cards + Pictures): Feelings",
      "Implicit Sets (Cards + Pictures): Fruits",
      "Implicit Sets (Cards + Pictures): Furniture",
      "Implicit Sets (Cards + Pictures): Geometric Shapes",
      "Implicit Sets (Cards + Pictures): Kitchen Tools",
      "Implicit Sets (Cards + Pictures): Masculine and Feminine",
      "Implicit Sets (Cards + Pictures): Occupations",
      "Implicit Sets (Cards + Pictures): Opposites",
      "Implicit Sets (Cards + Pictures): Place and Time Adverbs",
      "Implicit Sets (Cards + Pictures): Places",
      "Implicit Sets (Cards + Pictures): Prepositions",
      "Implicit Sets (Cards + Pictures): Senses",
      "Implicit Sets (Cards + Pictures): Singular and Dual",
      "Implicit Sets (Cards + Pictures): Singular and Plural",
      "Implicit Sets (Cards + Pictures): Transportation",
      "Implicit Sets (Cards + Pictures): Vegetables",
      "Incentive Spirometer",
      "Lemons / Plastic Straws",
      "Letter Cards and Models",
      "Long Mirror",
      "Magnetic Whiteboard with Markers and Eraser",
      "Matching Cards (Object and Shadow)",
      "Mazes",
      "Mouth Muscle Training Set",
      "Number Cards and Models",
      "Odd-One-Out Cards",
      "Oral Motor Group",
      "Picture Description Materials",
      "Plastic and Wooden Toys",
      "Puzzles",
      "Silicone Chewing Tools (CHEW TUBES)",
      "Small Table and Two Chairs",
      "Stories",
      "Training Books for Comprehension and Expression",
      "Video Voice Device",
      "Wax",
      "What's Wrong in the Picture? Cards",
      "Wooden Abacus"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Sterilization & CSSD",
    "devices": [
      "Autoclave 250L",
      "Autoclave 400L",
      "Autoclave 60 L",
      "ETO Sterilizer",
      "Ultrasonic Cleaner"
    ]
  },
  {
    "assetType": "طبي",
    "category": "Surgical Instrument Sets",
    "devices": [
      "Cataract Set",
      "DCR Set",
      "Major Set",
      "major vascular set",
      "micro vascular set",
      "Minor Set",
      "Retinal Set",
      "Squint Set"
    ]
  }
] as const satisfies readonly DeviceCatalogGroup[];
