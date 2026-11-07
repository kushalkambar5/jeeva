import Phaser from 'phaser';
import { InteractionPoint, LocationZone, GameStateEvent } from './types';
import { sound } from './audio';

export class VillageScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    sprint: Phaser.Input.Keyboard.Key;
    interact: Phaser.Input.Keyboard.Key;
  };
  private obstacleGroup!: Phaser.Physics.Arcade.StaticGroup;
  private lastFacing: 'down' | 'left' | 'right' | 'up' = 'down';
  private currentZoom = 1.75;
  private onStateChange?: (event: GameStateEvent) => void;
  private interactionPoints: InteractionPoint[] = [];
  private activeInteraction: InteractionPoint | null = null;
  private dustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private chestSprite?: Phaser.GameObjects.Image;
  private chestOpened = false;

  private locationZones: LocationZone[] = [
    {
      name: "Player's Homestead",
      zoneId: 'player_home',
      x1: 120,
      y1: 80,
      x2: 360,
      y2: 340,
      description: 'Your cozy village cottage with wooden fence and flowerbeds.',
    },
    {
      name: "Dr. Priya's Health Clinic",
      zoneId: 'hospital',
      x1: 400,
      y1: 80,
      x2: 660,
      y2: 340,
      description: 'The village hospital caring for villagers with traditional and modern remedies.',
    },
    {
      name: "Dev's General Store & Market",
      zoneId: 'shop',
      x1: 720,
      y1: 80,
      x2: 960,
      y2: 340,
      description: 'Bustling general merchandise and grocery depot stocked with daily supplies.',
    },
    {
      name: "Arjun's Mechanic & Scrap Workshop",
      zoneId: 'workshop',
      x1: 1000,
      y1: 80,
      x2: 1240,
      y2: 380,
      description: 'Heavy machinery, spare parts, tools, and the village backup electrical generator.',
    },
    {
      name: 'Kaveripura Central Plaza',
      zoneId: 'central_plaza',
      x1: 520,
      y1: 360,
      x2: 760,
      y2: 560,
      description: 'The heartbeat of the village with the central freshwater stone fountain.',
    },
    {
      name: "Ravi's Farmstead & Barn",
      zoneId: 'farm_barn',
      x1: 80,
      y1: 520,
      x2: 280,
      y2: 740,
      description: 'Timber red barn, grain storage, and animal shelter.',
    },
    {
      name: 'Cultivated Crop Fields',
      zoneId: 'farm_crops',
      x1: 280,
      y1: 560,
      x2: 480,
      y2: 780,
      description: 'Rich agricultural fields yielding carrots, wheat, and pumpkins.',
    },
    {
      name: 'Lotus Pond & Fishing Pier',
      zoneId: 'pond',
      x1: 40,
      y1: 740,
      x2: 260,
      y2: 930,
      description: 'Tranquil freshwater pond with floating lily pads and wooden dock.',
    },
    {
      name: 'Village Police & Guard Post',
      zoneId: 'police_post',
      x1: 760,
      y1: 520,
      x2: 980,
      y2: 740,
      description: 'Security outpost keeping Kaveripura safe with notice board and watchtower.',
    },
    {
      name: 'Whispering Oak Grove',
      zoneId: 'grove',
      x1: 1040,
      y1: 740,
      x2: 1240,
      y2: 920,
      description: 'A serene ancient oak clearing hiding long-forgotten treasures.',
    },
  ];

  constructor() {
    super({ key: 'VillageScene' });
  }

  public init(data: { onStateChange?: (event: GameStateEvent) => void }) {
    this.onStateChange = data.onStateChange;
  }

  preload() {
    // 1. Tilemap and base tileset
    this.load.tilemapTiledJSON('village_map', '/assets/maps/village.json');
    this.load.image('serene_village', '/assets/tilesets/serene_village_32x32.png');

    // 2. Crop plants & farm objects
    this.load.spritesheet('farm_plants', '/assets/tilesets/farm_plants.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('farm_objects', '/assets/tilesets/farm_objects.png');

    // 3. Hand-crafted and extracted building sprites
    this.load.image('building_main_house', '/assets/buildings/main_house.png');
    this.load.image('building_hospital', '/assets/buildings/hospital.png');
    this.load.image('building_shop', '/assets/buildings/shop.png');
    this.load.image('building_workshop', '/assets/buildings/workshop.png');
    this.load.image('building_farm_barn', '/assets/buildings/farm_barn.png');
    this.load.image('building_police_post', '/assets/buildings/police_post.png');
    this.load.image('prop_oak_tree', '/assets/buildings/oak_tree.png');
    this.load.image('prop_chest', '/assets/buildings/chest.png');
    this.load.image('village_fountain', '/assets/buildings/village_fountain.png');

    // 4. Player character ONLY (SuperRetroWorld 3x4 layout, 32x32)
    this.load.spritesheet('player', '/assets/characters/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create() {
    // World Dimensions: 1280 x 960 px
    this.physics.world.setBounds(0, 0, 1280, 960);

    // 1. Create Tilemap
    const map = this.make.tilemap({ key: 'village_map' });
    const tileset = map.addTilesetImage('serene_village', 'serene_village');

    if (tileset) {
      const groundLayer = map.createLayer('Ground', tileset, 0, 0);
      groundLayer?.setDepth(0);

      const detailsLayer = map.createLayer('Ground_Details', tileset, 0, 0);
      detailsLayer?.setDepth(5);

      const collisionLayer = map.createLayer('Collision', tileset, 0, 0);
      if (collisionLayer) {
        collisionLayer.setVisible(false);
        collisionLayer.setCollisionByExclusion([-1, 0]);
      }
    }

    // 2. Obstacle Static Group for Buildings, Trees & Props
    this.obstacleGroup = this.physics.add.staticGroup();

    // 3. Spawn Buildings
    this.spawnBuildings();

    // 4. Spawn Central Plaza Fountain & Decorations
    this.spawnCentralPlaza();

    // 5. Spawn Farmland Crops & Props
    this.spawnFarmland();

    // 6. Spawn Pond Features & Dock
    this.spawnPond();

    // 7. Spawn Trees & Environment Foliage
    this.spawnTreesAndFoliage();

    // 8. Spawn Secret Treasure Chest
    this.spawnSecretChest();

    // 9. Setup Interaction Points
    this.setupInteractionPoints();

    // 10. Spawn Player Character
    this.spawnPlayer();

    // 11. Add Colliders
    const collLayer = map.getLayer('Collision')?.tilemapLayer;
    if (collLayer) {
      this.physics.add.collider(this.player, collLayer);
    }
    this.physics.add.collider(this.player, this.obstacleGroup);

    // 12. Setup Camera
    this.setupCamera();

    // 13. Setup Input
    this.setupInputs();

    // 14. Subtle Ambient Floating Dust / Spores Particle Effect
    this.setupAmbientAtmosphere();
  }

  private spawnBuildings() {
    // 1. Player's House (Kushal's Home)
    // 96x128 sprite at x: 224, y: 160
    const playerHouse = this.add.image(224, 160, 'building_main_house').setOrigin(0.5, 0.5);
    playerHouse.setDepth(160 + 50);

    // Physics body at the base/walls
    const houseCollider = this.obstacleGroup.create(224, 175, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    houseCollider.setSize(86, 44);
    houseCollider.setVisible(false);

    // Add wooden fence around front garden
    this.addMarkerLabel(224, 90, "Player's House", '#93C476');

    // 2. Village Hospital (Dr. Priya's Health Clinic)
    // 160x128 sprite at x: 528, y: 160
    const hospital = this.add.image(528, 160, 'building_hospital').setOrigin(0.5, 0.5);
    hospital.setDepth(160 + 50);

    const hospitalCollider = this.obstacleGroup.create(528, 175, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    hospitalCollider.setSize(144, 48);
    hospitalCollider.setVisible(false);

    this.addMarkerLabel(528, 90, 'Village Clinic', '#75B9D0');

    // 3. Dev's General Store & Provisions
    // 128x128 sprite at x: 832, y: 160
    const shop = this.add.image(832, 160, 'building_shop').setOrigin(0.5, 0.5);
    shop.setDepth(160 + 50);

    const shopCollider = this.obstacleGroup.create(832, 175, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    shopCollider.setSize(114, 46);
    shopCollider.setVisible(false);

    this.addMarkerLabel(832, 90, 'General Store', '#F4D477');

    // 4. Arjun's Mechanic Workshop
    // 160x128 sprite at x: 1104, y: 168
    const workshop = this.add.image(1104, 168, 'building_workshop').setOrigin(0.5, 0.5);
    workshop.setDepth(168 + 50);

    const workshopCollider = this.obstacleGroup.create(1104, 185, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    workshopCollider.setSize(146, 50);
    workshopCollider.setVisible(false);

    this.addMarkerLabel(1104, 98, "Arjun's Workshop", '#C87545');

    // 5. Ravi's Farmstead Barn
    // 128x128 sprite at x: 176, y: 624
    const barn = this.add.image(176, 624, 'building_farm_barn').setOrigin(0.5, 0.5);
    barn.setDepth(624 + 50);

    const barnCollider = this.obstacleGroup.create(176, 640, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    barnCollider.setSize(116, 48);
    barnCollider.setVisible(false);

    this.addMarkerLabel(176, 554, "Ravi's Barn", '#E98F9F');

    // 6. Kaveripura Police & Guard Post
    // 128x128 sprite at x: 864, y: 624
    const policePost = this.add.image(864, 624, 'building_police_post').setOrigin(0.5, 0.5);
    policePost.setDepth(624 + 50);

    const policeCollider = this.obstacleGroup.create(864, 640, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    policeCollider.setSize(116, 48);
    policeCollider.setVisible(false);

    this.addMarkerLabel(864, 554, 'Police Post', '#78A85B');
  }

  private addMarkerLabel(x: number, y: number, text: string, color = '#FFFFFF') {
    const label = this.add.text(x, y, text, {
      fontFamily: 'var(--font-pixel, monospace)',
      fontSize: '11px',
      color: color,
      stroke: '#0F1712',
      strokeThickness: 3,
      align: 'center',
    });
    label.setOrigin(0.5, 0.5);
    label.setDepth(y + 200);
  }

  private spawnCentralPlaza() {
    // Village Central Fountain (128x96)
    const fountain = this.add.image(640, 448, 'village_fountain').setOrigin(0.5, 0.5);
    fountain.setDepth(448 + 20);

    const fountainCollider = this.obstacleGroup.create(640, 455, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    fountainCollider.setSize(92, 40);
    fountainCollider.setVisible(false);

    this.addMarkerLabel(640, 396, 'Kaveripura Fountain', '#75B9D0');

    // Small water ripple effect in fountain center
    const circle = this.add.circle(640, 446, 8, 0x75b9d0, 0.4);
    circle.setDepth(448 + 21);
    this.tweens.add({
      targets: circle,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 1800,
      repeat: -1,
      ease: 'Quad.easeOut',
    });
  }

  private spawnFarmland() {
    // Crop fields at x: 300..460, y: 600..730
    // Spawn neat rows of carrots, wheat, cabbages using 'farm_plants'
    const cropTypes = [0, 1, 2, 8, 9, 10, 16, 17];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        const cropX = 310 + col * 26;
        const cropY = 610 + row * 32;
        const frameIdx = cropTypes[(row * 2 + col) % cropTypes.length];
        const plant = this.add.sprite(cropX, cropY, 'farm_plants', frameIdx);
        plant.setScale(1.2);
        plant.setDepth(cropY);
      }
    }

    // Wooden scarecrow / prop in the middle
    const scarecrow = this.add.circle(388, 660, 4, 0xd4a373);
    scarecrow.setDepth(660);
    this.addMarkerLabel(388, 590, 'Crop Fields', '#93C476');
  }

  private spawnPond() {
    // Water lotus pond at bottom-left
    // Wooden pier / dock: x: 140, y: 780
    const dock = this.add.rectangle(130, 775, 40, 18, 0x8b5a2b);
    dock.setStrokeStyle(2, 0x5c3a1e);
    dock.setDepth(776);

    // Lily pad circles on pond water
    const lilyPads = [
      { x: 90, y: 810 },
      { x: 130, y: 840 },
      { x: 80, y: 860 },
      { x: 160, y: 820 },
    ];
    lilyPads.forEach((lp) => {
      const pad = this.add.circle(lp.x, lp.y, 6, 0x2d6a4f, 0.7);
      pad.setDepth(lp.y);
      this.tweens.add({
        targets: pad,
        y: lp.y + 2,
        duration: 2000 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    this.addMarkerLabel(110, 750, 'Lotus Pond', '#75B9D0');
  }

  private spawnTreesAndFoliage() {
    // Strategic tree coordinates along village borders and scenic groves
    const treePositions = [
      // North forest edge
      { x: 70, y: 55 },
      { x: 130, y: 50 },
      { x: 330, y: 50 },
      { x: 390, y: 55 },
      { x: 670, y: 50 },
      { x: 730, y: 55 },
      { x: 970, y: 50 },
      { x: 1220, y: 55 },
      // West perimeter
      { x: 45, y: 150 },
      { x: 45, y: 260 },
      { x: 45, y: 380 },
      { x: 45, y: 490 },
      // East perimeter
      { x: 1235, y: 200 },
      { x: 1235, y: 340 },
      { x: 1235, y: 480 },
      { x: 1235, y: 620 },
      { x: 1235, y: 760 },
      { x: 1235, y: 890 },
      // South boundary & grove
      { x: 360, y: 915 },
      { x: 460, y: 915 },
      { x: 570, y: 915 },
      { x: 680, y: 915 },
      { x: 790, y: 915 },
      { x: 1010, y: 915 },
      { x: 1110, y: 915 },
      // Pond side grove
      { x: 215, y: 770 },
      { x: 205, y: 870 },
      // Secret east grove
      { x: 1120, y: 820 },
      { x: 1210, y: 810 },
    ];

    treePositions.forEach((pos) => {
      const tree = this.add.image(pos.x, pos.y, 'prop_oak_tree').setOrigin(0.5, 0.5);
      tree.setDepth(pos.y + 35);

      // Circular collider at trunk base
      const collider = this.obstacleGroup.create(pos.x, pos.y + 24, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
      collider.setCircle(14, -14, -14);
      collider.setVisible(false);
    });
  }

  private spawnSecretChest() {
    // Hidden treasure chest in the southeast oak grove: x: 1180, y: 850
    this.chestSprite = this.add.image(1175, 845, 'prop_chest').setOrigin(0.5, 0.5);
    this.chestSprite.setScale(1.5);
    this.chestSprite.setDepth(845);

    // Subtle pulsing sparkle indicator
    const glow = this.add.circle(1175, 845, 12, 0xf4d477, 0.3);
    glow.setDepth(844);
    this.tweens.add({
      targets: glow,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0.1,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private setupInteractionPoints() {
    this.interactionPoints = [
      {
        id: 'door_player_home',
        name: "Player's House",
        type: 'door',
        x: 224,
        y: 215,
        radius: 46,
        title: "Kushal's Cottage",
        description: 'Your home in Kaveripura. Clean, warm, and stocked with daily essentials. Ready for interior entrance in the next phase.',
        actionLabel: 'Knock / Enter',
      },
      {
        id: 'door_hospital',
        name: 'Village Clinic',
        type: 'door',
        x: 528,
        y: 215,
        radius: 48,
        title: "Dr. Priya's Health Clinic",
        description: 'Village healthcare center. Priya prepares herbal compresses and medical care for the recovering community.',
        actionLabel: 'Visit Clinic',
      },
      {
        id: 'door_shop',
        name: "Dev's General Store",
        type: 'door',
        x: 832,
        y: 215,
        radius: 46,
        title: "Dev's Provisions",
        description: 'Dry goods, salt, tools, and grain sacks. Dev trades with merchants from neighboring villages.',
        actionLabel: 'Inspect Storefront',
      },
      {
        id: 'door_workshop',
        name: "Arjun's Workshop",
        type: 'door',
        x: 1104,
        y: 225,
        radius: 48,
        title: "Arjun's Mechanic Garage",
        description: 'Sparks fly from metal fabrication tools. Arjun maintains irrigation pumps, generators, and vehicle motors.',
        actionLabel: 'Visit Workshop',
      },
      {
        id: 'door_farm_barn',
        name: "Ravi's Farm Barn",
        type: 'door',
        x: 176,
        y: 680,
        radius: 46,
        title: "Ravi's Barn & Silo",
        description: 'Fresh straw, pitchforks, and bags of winter feed. Ravi oversees the village grain supply.',
        actionLabel: 'Check Barn',
      },
      {
        id: 'door_police_post',
        name: 'Police Post',
        type: 'door',
        x: 864,
        y: 680,
        radius: 46,
        title: 'Kaveripura Guard Station',
        description: 'The village law and order outpost. The notice board lists storm relief alerts and perimeter patrol reports.',
        actionLabel: 'Inspect Notice Board',
      },
      {
        id: 'plaza_fountain',
        name: 'Village Fountain',
        type: 'inspect',
        x: 640,
        y: 448,
        radius: 56,
        title: 'Ancient Stone Fountain',
        description: 'Carved from weathered Deccan stone. Fresh water trickles continually, acting as the community gathering spot.',
        actionLabel: 'Drink Water',
      },
      {
        id: 'farm_crops_node',
        name: 'Crop Fields',
        type: 'resource',
        x: 388,
        y: 660,
        radius: 64,
        title: 'Lush Vegetable Rows',
        description: 'Organic carrots, cabbages, and pumpkins thriving in fertilized black soil.',
        actionLabel: 'Inspect Crops',
      },
      {
        id: 'village_generator',
        name: 'Village Generator',
        type: 'inspect',
        x: 1150,
        y: 320,
        radius: 50,
        title: 'Auxiliary Diesel Generator',
        description: 'Key infrastructure powering the clinic refrigeration unit. Currently waiting on spare spark plugs.',
        actionLabel: 'Inspect Machinery',
      },
      {
        id: 'secret_chest',
        name: 'Ancient Chest',
        type: 'chest',
        x: 1175,
        y: 845,
        radius: 42,
        title: 'Weathered Brass Chest',
        description: 'An old ironbound chest tucked away under the whispering oak canopy.',
        actionLabel: 'Open Chest',
      },
    ];
  }

  private spawnPlayer() {
    // Only player character from public/assets/characters/player.png!
    // Spawn at x: 256, y: 288 (on the stone pathway outside the player cottage)
    this.player = this.physics.add.sprite(256, 288, 'player', 1);
    this.player.setOrigin(0.5, 0.7);
    this.player.body?.setSize(16, 16);
    this.player.body?.setOffset(8, 16);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(288);

    // 4-Directional Walk Animations (SuperRetroWorld 3x4 layout)
    // Down: row 0 (frames 0, 1, 2)
    this.anims.create({
      key: 'player-walk-down',
      frames: this.anims.generateFrameNumbers('player', { frames: [0, 1, 2, 1] }),
      frameRate: 8,
      repeat: -1,
    });

    // Left: row 1 (frames 3, 4, 5)
    this.anims.create({
      key: 'player-walk-left',
      frames: this.anims.generateFrameNumbers('player', { frames: [3, 4, 5, 4] }),
      frameRate: 8,
      repeat: -1,
    });

    // Right: row 2 (frames 6, 7, 8)
    this.anims.create({
      key: 'player-walk-right',
      frames: this.anims.generateFrameNumbers('player', { frames: [6, 7, 8, 7] }),
      frameRate: 8,
      repeat: -1,
    });

    // Up: row 3 (frames 9, 10, 11)
    this.anims.create({
      key: 'player-walk-up',
      frames: this.anims.generateFrameNumbers('player', { frames: [9, 10, 11, 10] }),
      frameRate: 8,
      repeat: -1,
    });

    // Initial idle facing down
    this.player.setFrame(1);
  }

  private setupCamera() {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, 1280, 960);
    this.cameras.main.setZoom(this.currentZoom);
    this.cameras.main.roundPixels = true;
  }

  private setupInputs() {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      sprint: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      interact: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };

    // Zoom Toggle Key (Z)
    this.input.keyboard.on('keydown-Z', () => {
      this.cycleZoom();
    });

    // Interaction Trigger Key (E or Space)
    this.input.keyboard.on('keydown-E', () => {
      this.triggerActiveInteraction();
    });
    this.input.keyboard.on('keydown-SPACE', () => {
      this.triggerActiveInteraction();
    });
  }

  private setupAmbientAtmosphere() {
    // Gentle floating light dust particles
    const particles = this.add.particles(0, 0, 'farm_plants', {
      frame: 1,
      x: { min: 40, max: 1240 },
      y: { min: 40, max: 920 },
      lifespan: 5000,
      speedX: { min: -10, max: 10 },
      speedY: { min: -10, max: 10 },
      scale: { start: 0.2, end: 0 },
      alpha: { start: 0.3, end: 0 },
      blendMode: 'ADD',
      frequency: 250,
      maxParticles: 40,
    });
    particles.setDepth(999);
  }

  public cycleZoom() {
    if (this.currentZoom === 1.0) this.currentZoom = 1.5;
    else if (this.currentZoom === 1.5) this.currentZoom = 2.0;
    else this.currentZoom = 1.0;

    this.cameras.main.zoomTo(this.currentZoom, 300, 'Sine.easeInOut');
  }

  public setZoomLevel(zoom: number) {
    this.currentZoom = zoom;
    this.cameras.main.zoomTo(this.currentZoom, 300, 'Sine.easeInOut');
  }

  public getZoomLevel(): number {
    return this.currentZoom;
  }

  public triggerActiveInteraction() {
    if (!this.activeInteraction) return;

    if (this.activeInteraction.id === 'secret_chest' && !this.chestOpened) {
      this.chestOpened = true;
      this.activeInteraction.opened = true;
      this.activeInteraction.title = 'Ancient Village Compass Found!';
      this.activeInteraction.description = 'You opened the chest and found a polished brass surveyor compass engraved: "Property of Kaveripura Founders - 1924".';
      sound.playChestFanfare();

      if (this.chestSprite) {
        this.tweens.add({
          targets: this.chestSprite,
          scaleY: 1.2,
          y: this.chestSprite.y - 6,
          duration: 180,
          yoyo: true,
          ease: 'Back.easeOut',
        });
      }
    } else {
      sound.playInteractClick();
    }

    // Notify React
    if (this.onStateChange) {
      this.onStateChange({
        playerX: Math.round(this.player.x),
        playerY: Math.round(this.player.y),
        currentZone: this.getCurrentZoneName(),
        isMoving: false,
        isSprinting: false,
        activeInteraction: { ...this.activeInteraction },
      });
    }
  }

  private getCurrentZoneName(): string {
    const px = this.player.x;
    const py = this.player.y;
    for (const zone of this.locationZones) {
      if (px >= zone.x1 && px <= zone.x2 && py >= zone.y1 && py <= zone.y2) {
        return zone.name;
      }
    }
    return 'Kaveripura Village Paths';
  }

  update() {
    if (!this.player || !this.player.body) return;

    // 1. Calculate Velocity & Movement
    let vx = 0;
    let vy = 0;

    const isUp = this.cursors?.up?.isDown || this.wasd?.up?.isDown;
    const isDown = this.cursors?.down?.isDown || this.wasd?.down?.isDown;
    const isLeft = this.cursors?.left?.isDown || this.wasd?.left?.isDown;
    const isRight = this.cursors?.right?.isDown || this.wasd?.right?.isDown;
    const isSprinting = Boolean(this.cursors?.shift?.isDown || this.wasd?.sprint?.isDown);

    const baseSpeed = isSprinting ? 210 : 125;

    if (isUp) vy -= 1;
    if (isDown) vy += 1;
    if (isLeft) vx -= 1;
    if (isRight) vx += 1;

    // Normalize diagonal movement speed
    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    this.player.setVelocity(vx * baseSpeed, vy * baseSpeed);

    // 2. Play Animations & Handle Facing
    const isMoving = vx !== 0 || vy !== 0;

    if (isMoving) {
      sound.playFootstep(isSprinting);

      if (Math.abs(vx) > Math.abs(vy)) {
        if (vx < 0) {
          this.player.anims.play('player-walk-left', true);
          this.lastFacing = 'left';
        } else {
          this.player.anims.play('player-walk-right', true);
          this.lastFacing = 'right';
        }
      } else {
        if (vy < 0) {
          this.player.anims.play('player-walk-up', true);
          this.lastFacing = 'up';
        } else {
          this.player.anims.play('player-walk-down', true);
          this.lastFacing = 'down';
        }
      }
    } else {
      this.player.anims.stop();
      switch (this.lastFacing) {
        case 'left':
          this.player.setFrame(4);
          break;
        case 'right':
          this.player.setFrame(7);
          break;
        case 'up':
          this.player.setFrame(10);
          break;
        case 'down':
        default:
          this.player.setFrame(1);
          break;
      }
    }

    // 3. Y-Depth Sorting for Player (2.5D visual depth)
    this.player.setDepth(this.player.y);

    // 4. Check Nearest Interaction Point
    let nearest: InteractionPoint | null = null;
    let minDistance = 999999;

    for (const point of this.interactionPoints) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y);
      if (dist <= point.radius && dist < minDistance) {
        minDistance = dist;
        nearest = point;
      }
    }

    const interactionChanged = (this.activeInteraction?.id ?? null) !== (nearest?.id ?? null);
    this.activeInteraction = nearest;

    if (interactionChanged && nearest) {
      sound.playChime();
    }

    // 5. Emit state updates periodically or on change
    if (this.onStateChange) {
      this.onStateChange({
        playerX: Math.round(this.player.x),
        playerY: Math.round(this.player.y),
        currentZone: this.getCurrentZoneName(),
        isMoving,
        isSprinting,
        activeInteraction: this.activeInteraction ? { ...this.activeInteraction } : null,
      });
    }
  }
}
