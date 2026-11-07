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
  private currentZoom = 1.6;
  private onStateChange?: (event: GameStateEvent) => void;
  private interactionPoints: InteractionPoint[] = [];
  private activeInteraction: InteractionPoint | null = null;
  private chestSprite?: Phaser.GameObjects.Image;
  private chestOpened = false;

  // World size: 1920 x 1440
  public static readonly WORLD_WIDTH = 1920;
  public static readonly WORLD_HEIGHT = 1440;

  private locationZones: LocationZone[] = [
    {
      name: "Player's Homestead",
      zoneId: 'player_home',
      x1: 180,
      y1: 120,
      x2: 480,
      y2: 420,
      description: 'Your cozy village cottage with front porch and stone flowerbeds.',
    },
    {
      name: "Dr. Priya's Health Clinic",
      zoneId: 'hospital',
      x1: 560,
      y1: 120,
      x2: 880,
      y2: 420,
      description: 'The village medical center providing care and traditional remedies.',
    },
    {
      name: "Dev's General Store & Market",
      zoneId: 'shop',
      x1: 1000,
      y1: 120,
      x2: 1320,
      y2: 420,
      description: 'The community store stocked with provisions, seeds, and trading goods.',
    },
    {
      name: "Arjun's Mechanic & Scrap Workshop",
      zoneId: 'workshop',
      x1: 1400,
      y1: 120,
      x2: 1720,
      y2: 440,
      description: 'Heavy machinery repair shop, tools, and the village electrical generator.',
    },
    {
      name: 'Kaveripura Central Plaza',
      zoneId: 'central_plaza',
      x1: 780,
      y1: 460,
      x2: 1120,
      y2: 740,
      description: 'The town square with the central stone fountain and crossroads.',
    },
    {
      name: "Ravi's Farmstead Barn",
      zoneId: 'farm_barn',
      x1: 180,
      y1: 780,
      x2: 480,
      y2: 1060,
      description: 'Ravi\'s red timber barn, silo, and tool sheds.',
    },
    {
      name: 'Cultivated Crop Fields',
      zoneId: 'farm_crops',
      x1: 480,
      y1: 740,
      x2: 800,
      y2: 1020,
      description: 'Rich agricultural fields yielding carrots, wheat, and pumpkins.',
    },
    {
      name: 'Lotus Pond & Fishing Pier',
      zoneId: 'pond',
      x1: 140,
      y1: 1060,
      x2: 560,
      y2: 1360,
      description: 'Tranquil freshwater pond with floating lily pads and a wooden dock.',
    },
    {
      name: 'Village Police & Guard Post',
      zoneId: 'police_post',
      x1: 1280,
      y1: 780,
      x2: 1580,
      y2: 1060,
      description: 'Security outpost with notice board and watchtower.',
    },
    {
      name: 'Whispering Oak Grove',
      zoneId: 'grove',
      x1: 1600,
      y1: 1120,
      x2: 1880,
      y2: 1380,
      description: 'An ancient oak clearing hiding long-forgotten village treasures.',
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

    // 3. Complete standalone building sprites (96x128 each)
    this.load.image('building_main_house', '/assets/buildings/main_house.png');
    this.load.image('building_hospital', '/assets/buildings/hospital.png');
    this.load.image('building_shop', '/assets/buildings/shop.png');
    this.load.image('building_workshop', '/assets/buildings/workshop.png');
    this.load.image('building_farm_barn', '/assets/buildings/farm_barn.png');
    this.load.image('building_police_post', '/assets/buildings/police_post.png');
    this.load.image('prop_oak_tree', '/assets/buildings/oak_tree.png');
    this.load.image('prop_chest', '/assets/buildings/chest.png');
    this.load.image('village_fountain', '/assets/buildings/village_fountain.png');

    // 4. Player character ONLY
    this.load.spritesheet('player', '/assets/characters/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create() {
    const W = VillageScene.WORLD_WIDTH;
    const H = VillageScene.WORLD_HEIGHT;

    // Set background color to exact meadow grass green so zero black space appears anywhere
    this.cameras.main.setBackgroundColor('#79C867');
    this.physics.world.setBounds(0, 0, W, H);

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

    // 2. Obstacle Static Group
    this.obstacleGroup = this.physics.add.staticGroup();

    // 3. Spawn Buildings (96x128 complete standalone houses)
    this.spawnBuildings();

    // 4. Spawn Central Plaza Fountain & Water Ripples
    this.spawnCentralPlaza();

    // 5. Spawn Farmland Crops & Props
    this.spawnFarmland();

    // 6. Spawn Pond Features & Pier
    this.spawnPond();

    // 7. Spawn Trees & Environment Foliage
    this.spawnTreesAndFoliage();

    // 8. Spawn Secret Treasure Chest
    this.spawnSecretChest();

    // 9. Setup Interaction Points
    this.setupInteractionPoints();

    // 10. Spawn Player Character (spawn outside player house at x: 336, y: 350)
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

    // 14. Responsive window resize handler
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize() {
    this.cameras.main.setSize(this.scale.width, this.scale.height);
  }

  private spawnBuildings() {
    // 1. Player's Cottage (96x128) at x: 336, y: 240
    const playerHouse = this.add.image(336, 240, 'building_main_house').setOrigin(0.5, 0.5);
    playerHouse.setDepth(240 + 50);

    const houseCollider = this.obstacleGroup.create(336, 260, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    houseCollider.setSize(84, 38);
    houseCollider.setVisible(false);
    this.addMarkerLabel(336, 165, "Player's Cottage", '#93C476');

    // 2. Village Health Clinic (96x128 Blue House) at x: 720, y: 240
    const hospital = this.add.image(720, 240, 'building_hospital').setOrigin(0.5, 0.5);
    hospital.setDepth(240 + 50);

    const hospitalCollider = this.obstacleGroup.create(720, 260, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    hospitalCollider.setSize(84, 38);
    hospitalCollider.setVisible(false);
    this.addMarkerLabel(720, 165, 'Village Clinic', '#75B9D0');

    // 3. Dev's General Store (96x128 Red House) at x: 1168, y: 240
    const shop = this.add.image(1168, 240, 'building_shop').setOrigin(0.5, 0.5);
    shop.setDepth(240 + 50);

    const shopCollider = this.obstacleGroup.create(1168, 260, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    shopCollider.setSize(84, 38);
    shopCollider.setVisible(false);
    this.addMarkerLabel(1168, 165, 'General Store', '#F4D477');

    // 4. Arjun's Mechanic Workshop (96x128 Green/Stone House) at x: 1552, y: 240
    const workshop = this.add.image(1552, 240, 'building_workshop').setOrigin(0.5, 0.5);
    workshop.setDepth(240 + 50);

    const workshopCollider = this.obstacleGroup.create(1552, 260, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    workshopCollider.setSize(84, 38);
    workshopCollider.setVisible(false);
    this.addMarkerLabel(1552, 165, "Arjun's Workshop", '#C87545');

    // 5. Ravi's Farm Barn (96x128 Red Barn) at x: 336, y: 920
    const barn = this.add.image(336, 920, 'building_farm_barn').setOrigin(0.5, 0.5);
    barn.setDepth(920 + 50);

    const barnCollider = this.obstacleGroup.create(336, 940, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    barnCollider.setSize(84, 38);
    barnCollider.setVisible(false);
    this.addMarkerLabel(336, 845, "Ravi's Barn", '#E98F9F');

    // 6. Police & Guard Post (96x128 Green Guard House) at x: 1424, y: 920
    const policePost = this.add.image(1424, 920, 'building_police_post').setOrigin(0.5, 0.5);
    policePost.setDepth(920 + 50);

    const policeCollider = this.obstacleGroup.create(1424, 940, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    policeCollider.setSize(84, 38);
    policeCollider.setVisible(false);
    this.addMarkerLabel(1424, 845, 'Police Post', '#78A85B');
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
    // Village Central Fountain (64x64 pixel art stone fountain) at x: 944, y: 608
    const fountain = this.add.image(944, 608, 'village_fountain').setOrigin(0.5, 0.5);
    fountain.setDepth(608 + 20);

    const fountainCollider = this.obstacleGroup.create(944, 614, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    fountainCollider.setCircle(22, -22, -22);
    fountainCollider.setVisible(false);

    this.addMarkerLabel(944, 560, 'Kaveripura Fountain', '#75B9D0');

    // Water ripple effect in fountain basin
    const circle = this.add.circle(944, 608, 12, 0x75b9d0, 0.4);
    circle.setDepth(608 + 21);
    this.tweens.add({
      targets: circle,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 1600,
      repeat: -1,
      ease: 'Quad.easeOut',
    });
  }

  private spawnFarmland() {
    // Crop fields at x: 500..740, y: 780..980
    const cropTypes = [0, 1, 2, 8, 9, 10, 16, 17];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 8; col++) {
        const cropX = 510 + col * 30;
        const cropY = 790 + row * 32;
        const frameIdx = cropTypes[(row * 2 + col) % cropTypes.length];
        const plant = this.add.sprite(cropX, cropY, 'farm_plants', frameIdx);
        plant.setScale(1.2);
        plant.setDepth(cropY);
      }
    }

    this.addMarkerLabel(625, 755, 'Crop Fields', '#93C476');
  }

  private spawnPond() {
    // Lotus pond at x: 192..512, y: 1088..1280
    // Wooden pier / dock: x: 530, y: 1200
    const dock = this.add.rectangle(520, 1200, 56, 20, 0x8b5a2b);
    dock.setStrokeStyle(2, 0x5c3a1e);
    dock.setDepth(1201);

    // Lily pad circles on pond water
    const lilyPads = [
      { x: 260, y: 1140 },
      { x: 380, y: 1180 },
      { x: 300, y: 1220 },
      { x: 440, y: 1150 },
      { x: 340, y: 1250 },
    ];
    lilyPads.forEach((lp) => {
      const pad = this.add.circle(lp.x, lp.y, 7, 0x2d6a4f, 0.7);
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

    this.addMarkerLabel(352, 1070, 'Lotus Pond', '#75B9D0');
  }

  private spawnTreesAndFoliage() {
    const treePositions = [
      // North forest edge
      { x: 100, y: 70 },
      { x: 200, y: 65 },
      { x: 480, y: 65 },
      { x: 580, y: 70 },
      { x: 860, y: 65 },
      { x: 960, y: 70 },
      { x: 1320, y: 65 },
      { x: 1420, y: 70 },
      { x: 1700, y: 65 },
      { x: 1820, y: 70 },
      // West perimeter
      { x: 60, y: 200 },
      { x: 60, y: 360 },
      { x: 60, y: 520 },
      { x: 60, y: 680 },
      { x: 60, y: 840 },
      { x: 60, y: 1000 },
      { x: 60, y: 1160 },
      { x: 60, y: 1320 },
      // East perimeter
      { x: 1860, y: 200 },
      { x: 1860, y: 360 },
      { x: 1860, y: 520 },
      { x: 1860, y: 680 },
      { x: 1860, y: 840 },
      { x: 1860, y: 1000 },
      { x: 1860, y: 1160 },
      { x: 1860, y: 1320 },
      // South boundary & grove
      { x: 600, y: 1390 },
      { x: 740, y: 1390 },
      { x: 880, y: 1390 },
      { x: 1020, y: 1390 },
      { x: 1160, y: 1390 },
      { x: 1300, y: 1390 },
      { x: 1440, y: 1390 },
      { x: 1580, y: 1390 },
      { x: 1720, y: 1390 },
      // Pond side trees
      { x: 120, y: 1020 },
      { x: 550, y: 1270 },
      // Secret east grove
      { x: 1720, y: 1240 },
      { x: 1820, y: 1220 },
    ];

    treePositions.forEach((pos) => {
      const tree = this.add.image(pos.x, pos.y, 'prop_oak_tree').setOrigin(0.5, 0.5);
      tree.setDepth(pos.y + 35);

      const collider = this.obstacleGroup.create(pos.x, pos.y + 24, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
      collider.setCircle(14, -14, -14);
      collider.setVisible(false);
    });
  }

  private spawnSecretChest() {
    this.chestSprite = this.add.image(1780, 1280, 'prop_chest').setOrigin(0.5, 0.5);
    this.chestSprite.setScale(1.5);
    this.chestSprite.setDepth(1280);

    const glow = this.add.circle(1780, 1280, 12, 0xf4d477, 0.3);
    glow.setDepth(1279);
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
        name: "Player's Cottage",
        type: 'door',
        x: 336,
        y: 290,
        radius: 46,
        title: "Kushal's Cottage",
        description: 'Your home in Kaveripura. Clean, warm, and stocked with daily essentials. Ready for interior level load in next phase.',
        actionLabel: 'Knock / Enter',
      },
      {
        id: 'door_hospital',
        name: 'Village Clinic',
        type: 'door',
        x: 720,
        y: 290,
        radius: 48,
        title: "Dr. Priya's Health Clinic",
        description: 'Village healthcare center. Priya prepares herbal compresses and medical care for the recovering community.',
        actionLabel: 'Visit Clinic',
      },
      {
        id: 'door_shop',
        name: "Dev's General Store",
        type: 'door',
        x: 1168,
        y: 290,
        radius: 46,
        title: "Dev's Provisions",
        description: 'Dry goods, salt, tools, and grain sacks. Dev trades with merchants from neighboring villages.',
        actionLabel: 'Inspect Storefront',
      },
      {
        id: 'door_workshop',
        name: "Arjun's Workshop",
        type: 'door',
        x: 1552,
        y: 290,
        radius: 48,
        title: "Arjun's Mechanic Garage",
        description: 'Sparks fly from metal fabrication tools. Arjun maintains irrigation pumps, generators, and vehicle motors.',
        actionLabel: 'Visit Workshop',
      },
      {
        id: 'door_farm_barn',
        name: "Ravi's Farm Barn",
        type: 'door',
        x: 336,
        y: 970,
        radius: 46,
        title: "Ravi's Barn & Silo",
        description: 'Fresh straw, pitchforks, and bags of winter feed. Ravi oversees the village grain supply.',
        actionLabel: 'Check Barn',
      },
      {
        id: 'door_police_post',
        name: 'Police Post',
        type: 'door',
        x: 1424,
        y: 970,
        radius: 46,
        title: 'Kaveripura Guard Station',
        description: 'The village law and order outpost. The notice board lists storm relief alerts and perimeter patrol reports.',
        actionLabel: 'Inspect Notice Board',
      },
      {
        id: 'plaza_fountain',
        name: 'Village Fountain',
        type: 'inspect',
        x: 944,
        y: 608,
        radius: 56,
        title: 'Kaveripura Stone Fountain',
        description: 'Carved from weathered Deccan stone. Fresh water trickles continually, acting as the community gathering spot.',
        actionLabel: 'Drink Water',
      },
      {
        id: 'farm_crops_node',
        name: 'Crop Fields',
        type: 'resource',
        x: 625,
        y: 860,
        radius: 64,
        title: 'Lush Vegetable Rows',
        description: 'Organic carrots, cabbages, and pumpkins thriving in fertilized soil.',
        actionLabel: 'Inspect Crops',
      },
      {
        id: 'secret_chest',
        name: 'Ancient Chest',
        type: 'chest',
        x: 1780,
        y: 1280,
        radius: 42,
        title: 'Weathered Brass Chest',
        description: 'An old ironbound chest tucked away under the whispering oak canopy.',
        actionLabel: 'Open Chest',
      },
    ];
  }

  private spawnPlayer() {
    // Spawn player outside player's house on the stone path
    this.player = this.physics.add.sprite(336, 350, 'player', 1);
    this.player.setOrigin(0.5, 0.7);
    this.player.body?.setSize(16, 16);
    this.player.body?.setOffset(8, 16);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(350);

    // 4-Directional Walk Animations
    this.anims.create({
      key: 'player-walk-down',
      frames: this.anims.generateFrameNumbers('player', { frames: [0, 1, 2, 1] }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: 'player-walk-left',
      frames: this.anims.generateFrameNumbers('player', { frames: [3, 4, 5, 4] }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: 'player-walk-right',
      frames: this.anims.generateFrameNumbers('player', { frames: [6, 7, 8, 7] }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: 'player-walk-up',
      frames: this.anims.generateFrameNumbers('player', { frames: [9, 10, 11, 10] }),
      frameRate: 8,
      repeat: -1,
    });

    this.player.setFrame(1);
  }

  private setupCamera() {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, VillageScene.WORLD_WIDTH, VillageScene.WORLD_HEIGHT);
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

    this.input.keyboard.on('keydown-Z', () => {
      this.cycleZoom();
    });

    this.input.keyboard.on('keydown-E', () => {
      this.triggerActiveInteraction();
    });
    this.input.keyboard.on('keydown-SPACE', () => {
      this.triggerActiveInteraction();
    });
  }

  public cycleZoom() {
    if (this.currentZoom === 1.2) this.currentZoom = 1.6;
    else if (this.currentZoom === 1.6) this.currentZoom = 2.0;
    else this.currentZoom = 1.2;

    this.cameras.main.zoomTo(this.currentZoom, 300, 'Sine.easeInOut');
  }

  public setZoomLevel(zoom: number) {
    this.currentZoom = zoom;
    this.cameras.main.zoomTo(this.currentZoom, 300, 'Sine.easeInOut');
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

    let vx = 0;
    let vy = 0;

    const isUp = this.cursors?.up?.isDown || this.wasd?.up?.isDown;
    const isDown = this.cursors?.down?.isDown || this.wasd?.down?.isDown;
    const isLeft = this.cursors?.left?.isDown || this.wasd?.left?.isDown;
    const isRight = this.cursors?.right?.isDown || this.wasd?.right?.isDown;
    const isSprinting = Boolean(this.cursors?.shift?.isDown || this.wasd?.sprint?.isDown);

    const baseSpeed = isSprinting ? 220 : 130;

    if (isUp) vy -= 1;
    if (isDown) vy += 1;
    if (isLeft) vx -= 1;
    if (isRight) vx += 1;

    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    this.player.setVelocity(vx * baseSpeed, vy * baseSpeed);

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

    // Depth sorting
    this.player.setDepth(this.player.y);

    // Interaction checks
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
