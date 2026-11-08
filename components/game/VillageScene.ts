import Phaser from 'phaser';
import {
  InteractionPoint,
  LocationZone,
  GameStateEvent,
  InteriorType,
  NPCWorldState,
  ScheduleItem,
} from './types';
import { sound } from './audio';
import {
  GAME_NPC_LIST,
  NPC_SPRITE_CONFIGS,
  getActiveScheduleForNPC,
  formatMinutesToTime,
  NPCDataTemplate,
} from './npcData';

export interface VillageSceneInitData {
  returnPos?: { x: number; y: number };
  onStateChange?: (event: GameStateEvent) => void;
}

function getIdleFrameForFacing(spriteKey: string, facing: 'down' | 'left' | 'right' | 'up'): number {
  const is4Col = spriteKey === 'character_doctor' || spriteKey === 'character_shopkeeper';
  if (is4Col) {
    switch (facing) {
      case 'left':
        return 4;
      case 'right':
        return 8;
      case 'up':
        return 12;
      case 'down':
      default:
        return 0;
    }
  } else {
    switch (facing) {
      case 'left':
        return 4;
      case 'right':
        return 7;
      case 'up':
        return 10;
      case 'down':
      default:
        return 1;
    }
  }
}

interface LiveNPCEntity {
  data: NPCDataTemplate;
  sprite: Phaser.Physics.Arcade.Sprite;
  badgeContainer: Phaser.GameObjects.Container;
  nameText: Phaser.GameObjects.Text;
  activityText: Phaser.GameObjects.Text;
  currentScheduleEntry: ScheduleItem;
  // Schedule anchor coordinates
  anchorX: number;
  anchorY: number;
  // Current wander/walk target
  targetX: number;
  targetY: number;
  // Casual behavior state
  behaviorState: 'idle' | 'wandering' | 'traveling' | 'talking' | 'following';
  idleWaitTimer: number; // in seconds
  facing: 'down' | 'left' | 'right' | 'up';
  interactionPoint: InteractionPoint;
}

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
  private initialSpawnPos: { x: number; y: number } = { x: 336, y: 350 };
  private isTransitioning = false;

  // In-Game Time & Schedule Simulation
  public gameTimeMinutes = 570; // 09:30 AM default
  public isClockRunning = true;
  private clockAccumulator = 0;
  private liveNPCs: Map<string, LiveNPCEntity> = new Map();
  private npcGroup!: Phaser.Physics.Arcade.Group;

  // NPC Companion & Tool Following System
  public followingNpcId: string | null = null;

  // Throttling State Broadcasts to prevent React re-render thrashing
  private lastBroadcastTime = 0;
  private lastPlayerX = 0;
  private lastPlayerY = 0;
  private lastZone = '';
  private lastActiveInteractionId: string | null = null;

  // World size: 1920 x 1440
  public static readonly WORLD_WIDTH = 1920;
  public static readonly WORLD_HEIGHT = 1440;
  public static readonly TALK_THRESHOLD_RADIUS = 60; // Max radius (in px) within which player can talk to an NPC

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
      name: "Dr. Meera's Health Clinic",
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
      description: 'The town square with the central stone fountain and ancient banyan chopal.',
    },
    {
      name: "Ravi's Farmstead Barn",
      zoneId: 'farm_barn',
      x1: 180,
      y1: 780,
      x2: 480,
      y2: 1060,
      description: "Ravi's red timber barn, silo, and tool sheds.",
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

  public init(data: VillageSceneInitData) {
    if (data.returnPos) {
      this.initialSpawnPos = data.returnPos;
    }
    if (data.onStateChange) {
      this.onStateChange = data.onStateChange;
    }
    this.isTransitioning = false;
  }

  preload() {
    this.load.tilemapTiledJSON('village_map', '/assets/maps/village.json');
    this.load.image('serene_village', '/assets/tilesets/serene_village_32x32.png');

    this.load.spritesheet('farm_plants', '/assets/tilesets/farm_plants.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('farm_objects', '/assets/tilesets/farm_objects.png');

    this.load.image('building_main_house', '/assets/buildings/main_house.png');
    this.load.image('building_hospital', '/assets/buildings/hospital.png');
    this.load.image('building_shop', '/assets/buildings/shop.png');
    this.load.image('building_workshop', '/assets/buildings/workshop.png');
    this.load.image('building_farm_barn', '/assets/buildings/farm_barn.png');
    this.load.image('building_police_post', '/assets/buildings/police_post.png');
    this.load.image('prop_oak_tree', '/assets/buildings/oak_tree.png');
    this.load.image('prop_chest', '/assets/buildings/chest.png');
    this.load.image('village_fountain', '/assets/buildings/village_fountain.png');

    // Player Spritesheet
    this.load.spritesheet('player', '/assets/characters/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Preload all 10 NPC Character Spritesheets
    for (const key of Object.keys(NPC_SPRITE_CONFIGS)) {
      const cfg = NPC_SPRITE_CONFIGS[key];
      this.load.spritesheet(cfg.textureKey, cfg.imagePath, {
        frameWidth: cfg.frameWidth,
        frameHeight: cfg.frameHeight,
      });
    }
  }

  create() {
    const W = VillageScene.WORLD_WIDTH;
    const H = VillageScene.WORLD_HEIGHT;

    this.cameras.main.setBackgroundColor('#79C867');
    this.cameras.main.fadeIn(250, 15, 23, 18);
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

    // 3. Spawn Buildings
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

    // 9. Setup Base World Interaction Points
    this.setupInteractionPoints();

    // 10. Spawn All Village NPCs According to Their Default Schedule
    this.spawnScheduledNPCs();

    // 11. Spawn Player Character at initialSpawnPos
    this.spawnPlayer(this.initialSpawnPos.x, this.initialSpawnPos.y);

    // 12. Add Colliders
    const collLayer = map.getLayer('Collision')?.tilemapLayer;
    if (collLayer) {
      this.physics.add.collider(this.player, collLayer);
    }
    this.physics.add.collider(this.player, this.obstacleGroup);
    this.physics.add.collider(this.player, this.npcGroup);

    // 13. Setup Camera
    this.setupCamera();

    // 14. Setup Input
    this.setupInputs();

    this.scale.on('resize', this.handleResize, this);

    // Initial State Broadcast
    this.broadcastState(true);
  }

  private handleResize() {
    this.cameras.main.setSize(this.scale.width, this.scale.height);
  }

  private spawnBuildings() {
    // 1. Player's Cottage at x: 336, y: 240
    const playerHouse = this.add.image(336, 240, 'building_main_house').setOrigin(0.5, 0.5);
    playerHouse.setDepth(240 + 50);

    const houseCollider = this.obstacleGroup.create(336, 260, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    houseCollider.setSize(84, 38);
    houseCollider.setVisible(false);
    this.addMarkerLabel(336, 165, "Player's Cottage", '#93C476');

    // 2. Dr. Meera's Clinic at x: 720, y: 240
    const clinic = this.add.image(720, 240, 'building_hospital').setOrigin(0.5, 0.5);
    clinic.setDepth(240 + 50);

    const clinicCollider = this.obstacleGroup.create(720, 260, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    clinicCollider.setSize(96, 42);
    clinicCollider.setVisible(false);
    this.addMarkerLabel(720, 165, 'Health Clinic', '#75B9D0');

    // 3. Dev's General Store at x: 1160, y: 240
    const store = this.add.image(1160, 240, 'building_shop').setOrigin(0.5, 0.5);
    store.setDepth(240 + 50);

    const storeCollider = this.obstacleGroup.create(1160, 260, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    storeCollider.setSize(96, 42);
    storeCollider.setVisible(false);
    this.addMarkerLabel(1160, 165, 'General Store', '#F4D477');

    // 4. Arjun's Workshop at x: 1560, y: 240
    const workshop = this.add.image(1560, 240, 'building_workshop').setOrigin(0.5, 0.5);
    workshop.setDepth(240 + 50);

    const workshopCollider = this.obstacleGroup.create(1560, 260, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    workshopCollider.setSize(96, 42);
    workshopCollider.setVisible(false);
    this.addMarkerLabel(1560, 165, 'Scrap Workshop', '#C87545');

    // 5. Ravi's Farm Barn at x: 330, y: 880
    const barn = this.add.image(330, 880, 'building_farm_barn').setOrigin(0.5, 0.5);
    barn.setDepth(880 + 50);

    const barnCollider = this.obstacleGroup.create(330, 900, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    barnCollider.setSize(108, 48);
    barnCollider.setVisible(false);
    this.addMarkerLabel(330, 805, "Ravi's Granary Barn", '#93C476');

    // 6. Police Post at x: 1430, y: 880
    const police = this.add.image(1430, 880, 'building_police_post').setOrigin(0.5, 0.5);
    police.setDepth(880 + 50);

    const policeCollider = this.obstacleGroup.create(1430, 900, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    policeCollider.setSize(84, 40);
    policeCollider.setVisible(false);
    this.addMarkerLabel(1430, 815, 'Police Post', '#75B9D0');
  }

  private addMarkerLabel(x: number, y: number, text: string, color: string) {
    const label = this.add.text(x, y, text, {
      fontFamily: 'Pixelify Sans, monospace',
      fontSize: '12px',
      color: color,
      backgroundColor: '#14271AEE',
      padding: { x: 6, y: 2 },
      stroke: '#0F1712',
      strokeThickness: 3,
    });
    label.setOrigin(0.5, 0.5);
    label.setDepth(2000);
  }

  private spawnCentralPlaza() {
    const fountain = this.add.image(950, 560, 'village_fountain').setOrigin(0.5, 0.5);
    fountain.setDepth(560 + 20);

    const fCollider = this.obstacleGroup.create(950, 565, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    fCollider.setSize(44, 30);
    fCollider.setVisible(false);

    this.tweens.add({
      targets: fountain,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private spawnFarmland() {
    const cropPositions = [
      { x: 540, y: 800, f: 0 },
      { x: 580, y: 800, f: 1 },
      { x: 620, y: 800, f: 2 },
      { x: 660, y: 800, f: 3 },
      { x: 700, y: 800, f: 0 },
      { x: 540, y: 840, f: 1 },
      { x: 580, y: 840, f: 2 },
      { x: 620, y: 840, f: 3 },
      { x: 660, y: 840, f: 0 },
      { x: 700, y: 840, f: 1 },
      { x: 540, y: 880, f: 2 },
      { x: 580, y: 880, f: 3 },
      { x: 620, y: 880, f: 0 },
      { x: 660, y: 880, f: 1 },
      { x: 700, y: 880, f: 2 },
    ];

    for (const crop of cropPositions) {
      const plant = this.add.sprite(crop.x, crop.y, 'farm_plants', crop.f);
      plant.setOrigin(0.5, 0.5);
      plant.setDepth(crop.y);
    }
  }

  private spawnPond() {
    const pondCenter = { x: 350, y: 1210 };
    for (let i = 0; i < 3; i++) {
      const ripple = this.add.ellipse(
        pondCenter.x + (i - 1) * 60,
        pondCenter.y + (i % 2 === 0 ? -15 : 20),
        40,
        18,
        0x75b9d0,
        0.3
      );
      ripple.setDepth(10);
      this.tweens.add({
        targets: ripple,
        scaleX: 1.4,
        scaleY: 1.4,
        alpha: 0,
        duration: 2000 + i * 500,
        repeat: -1,
        ease: 'Quad.easeOut',
      });
    }
  }

  private spawnTreesAndFoliage() {
    const treePositions = [
      { x: 100, y: 220 },
      { x: 80, y: 460 },
      { x: 120, y: 700 },
      { x: 520, y: 140 },
      { x: 920, y: 130 },
      { x: 1360, y: 140 },
      { x: 1780, y: 200 },
      { x: 1820, y: 450 },
      { x: 1800, y: 750 },
      { x: 1720, y: 1180 },
      { x: 1820, y: 1300 },
      { x: 1650, y: 1320 },
      { x: 1080, y: 920 },
      { x: 820, y: 1080 },
    ];

    for (const pos of treePositions) {
      const tree = this.add.image(pos.x, pos.y, 'prop_oak_tree').setOrigin(0.5, 0.85);
      tree.setDepth(pos.y + 40);

      const treeCollider = this.obstacleGroup.create(pos.x, pos.y, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
      treeCollider.setSize(24, 20);
      treeCollider.setVisible(false);
    }
  }

  private spawnSecretChest() {
    this.chestSprite = this.add.image(1780, 1280, 'prop_chest').setOrigin(0.5, 0.5);
    this.chestSprite.setDepth(1280);

    const chestCollider = this.obstacleGroup.create(1780, 1280, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    chestCollider.setSize(28, 24);
    chestCollider.setVisible(false);
  }

  private setupInteractionPoints() {
    this.interactionPoints = [
      {
        id: 'door_player_home',
        name: "Player's Cottage",
        type: 'door',
        x: 336,
        y: 288,
        radius: 44,
        title: "Player's Cozy Homestead",
        description: 'Warm cottage with front porch and herbal tea. Step through to enter the homestead interior.',
        actionLabel: 'Enter Cottage',
        targetInterior: 'player_home',
      },
      {
        id: 'door_hospital',
        name: 'Health Clinic',
        type: 'door',
        x: 720,
        y: 288,
        radius: 44,
        title: 'Kaveripura Health Clinic',
        description: 'Village healthcare center. Dr. Meera prepares herbal compresses and medical care for the recovering community.',
        actionLabel: 'Enter Clinic',
        targetInterior: 'hospital',
      },
      {
        id: 'door_shop',
        name: 'General Store & Market',
        type: 'door',
        x: 1160,
        y: 288,
        radius: 44,
        title: "Dev's General Store & Trading Post",
        description: 'Barter market stocked with winter grains, spices, oils, tools, and regional goods.',
        actionLabel: 'Enter Shop',
        targetInterior: 'shop',
      },
      {
        id: 'door_workshop',
        name: "Mechanic's Workshop",
        type: 'door',
        x: 1560,
        y: 288,
        radius: 44,
        title: "Arjun's Heavy Workshop",
        description: 'Repair bay with generators, spare cogs, welding torches, and copper machinery.',
        actionLabel: 'Enter Workshop',
        targetInterior: 'workshop',
      },
      {
        id: 'central_fountain',
        name: 'Town Fountain',
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

  /**
   * Spawns all 10 village NPC characters according to their default_schedule
   */
  private spawnScheduledNPCs() {
    this.npcGroup = this.physics.add.group();

    // Create 4-directional animations for all NPC sprites at casual, smooth 4 fps
    for (const key of Object.keys(NPC_SPRITE_CONFIGS)) {
      const cfg = NPC_SPRITE_CONFIGS[key];
      const tex = cfg.textureKey;

      if (!this.anims.exists(`${tex}-walk-down`)) {
        this.anims.create({
          key: `${tex}-walk-down`,
          frames: this.anims.generateFrameNumbers(tex, { frames: cfg.walkDown }),
          frameRate: 4,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`${tex}-walk-left`)) {
        this.anims.create({
          key: `${tex}-walk-left`,
          frames: this.anims.generateFrameNumbers(tex, { frames: cfg.walkLeft }),
          frameRate: 4,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`${tex}-walk-right`)) {
        this.anims.create({
          key: `${tex}-walk-right`,
          frames: this.anims.generateFrameNumbers(tex, { frames: cfg.walkRight }),
          frameRate: 4,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`${tex}-walk-up`)) {
        this.anims.create({
          key: `${tex}-walk-up`,
          frames: this.anims.generateFrameNumbers(tex, { frames: cfg.walkUp }),
          frameRate: 4,
          repeat: -1,
        });
      }
    }

    // Spawn each NPC at their scheduled position
    for (const template of GAME_NPC_LIST) {
      const cfg = NPC_SPRITE_CONFIGS[template.sprite_key] || NPC_SPRITE_CONFIGS.character_14;
      const active = getActiveScheduleForNPC(template, this.gameTimeMinutes);

      const sprite = this.physics.add.sprite(active.x, active.y, cfg.textureKey, cfg.idleFrame);
      sprite.setOrigin(0.5, 0.7);
      sprite.body?.setSize(16, 16);
      sprite.body?.setOffset(8, 16);
      sprite.setCollideWorldBounds(true);
      sprite.setDepth(active.y);
      sprite.setImmovable(true);

      // Create overhead badge container
      const badgeContainer = this.add.container(active.x, active.y - 32);

      // Name text
      const nameText = this.add.text(0, -9, template.name, {
        fontSize: '11px',
        fontFamily: 'Pixelify Sans, monospace',
        color: '#F4D477',
        stroke: '#14271A',
        strokeThickness: 3,
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Activity text
      const activityText = this.add.text(0, 5, `[${active.activityLabel}]`, {
        fontSize: '9px',
        fontFamily: 'Nunito, sans-serif',
        color: '#E5F0D9',
        backgroundColor: '#14271AEE',
        padding: { x: 4, y: 1 },
      }).setOrigin(0.5);

      badgeContainer.add([nameText, activityText]);
      badgeContainer.setDepth(active.y + 10);

      // Proximity interaction point
      const interactionPoint: InteractionPoint = {
        id: `npc_${template.id}`,
        name: template.name,
        type: 'npc',
        x: active.x,
        y: active.y,
        radius: VillageScene.TALK_THRESHOLD_RADIUS,
        title: `${template.name} — ${template.role}`,
        description: `${active.description}\n\nSpeaking style: ${template.speaking_style}`,
        actionLabel: 'Talk with (Voice / Text)',
        npcData: {
          id: template.id,
          name: template.name,
          role: template.role,
          spriteKey: template.sprite_key,
          spriteSrc: cfg.imagePath,
          homeZone: template.home_zone,
          currentZone: active.entry.targetZone || template.home_zone,
          x: active.x,
          y: active.y,
          activity: active.activity,
          activityLabel: active.activityLabel,
          activityDescription: active.description,
          timeSlot: active.entry.time,
          state: active.state,
          traits: template.personality_traits,
          speakingStyle: template.speaking_style,
          bio: template.bio,
          quote: template.quote,
          allowedActions: template.allowed_actions,
          defaultSchedule: template.default_schedule,
        },
      };

      this.interactionPoints.push(interactionPoint);
      this.npcGroup.add(sprite);

      this.liveNPCs.set(template.id, {
        data: template,
        sprite,
        badgeContainer,
        nameText,
        activityText,
        currentScheduleEntry: active.entry,
        anchorX: active.x,
        anchorY: active.y,
        targetX: active.x,
        targetY: active.y,
        behaviorState: 'idle',
        idleWaitTimer: 2.0 + Math.random() * 4.0, // Staggered casual start
        facing: 'down',
        interactionPoint,
      });
    }
  }

  private spawnPlayer(x: number, y: number) {
    this.player = this.physics.add.sprite(x, y, 'player', 1);
    this.player.setOrigin(0.5, 0.7);
    this.player.body?.setSize(16, 16);
    this.player.body?.setOffset(8, 16);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(y);

    // 4-Directional Walk Animations
    if (!this.anims.exists('player-walk-down')) {
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
    }

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
    // Do not capture Space in Phaser so window can handle push-to-talk voice interactions cleanly
    this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
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

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-Z');
      this.input.keyboard?.off('keydown-E');
      this.scale.off('resize', this.handleResize, this);
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

  public setGameTime(minutes: number, instant: boolean = false) {
    this.gameTimeMinutes = ((minutes % 1440) + 1440) % 1440;

    for (const liveNpc of this.liveNPCs.values()) {
      const active = getActiveScheduleForNPC(liveNpc.data, this.gameTimeMinutes);

      // Check if schedule slot actually changed
      const scheduleSlotChanged =
        liveNpc.currentScheduleEntry.time !== active.entry.time ||
        liveNpc.currentScheduleEntry.activity !== active.entry.activity;

      liveNpc.currentScheduleEntry = active.entry;
      liveNpc.activityText.setText(`[${active.activityLabel}]`);

      // Update interaction point metadata
      liveNpc.interactionPoint.title = `${liveNpc.data.name} — ${liveNpc.data.role}`;
      liveNpc.interactionPoint.description = `${active.description}\n\nSpeaking style: ${liveNpc.data.speaking_style}`;
      if (liveNpc.interactionPoint.npcData) {
        liveNpc.interactionPoint.npcData.activity = active.activity;
        liveNpc.interactionPoint.npcData.activityLabel = active.activityLabel;
        liveNpc.interactionPoint.npcData.activityDescription = active.description;
        liveNpc.interactionPoint.npcData.timeSlot = active.entry.time;
        liveNpc.interactionPoint.npcData.currentZone = active.entry.targetZone || liveNpc.data.home_zone;
        liveNpc.interactionPoint.npcData.state = active.state;
      }

      if (instant) {
        // Instant teleport (e.g. user clicked preset button or dragged time slider)
        liveNpc.anchorX = active.x;
        liveNpc.anchorY = active.y;
        liveNpc.targetX = active.x;
        liveNpc.targetY = active.y;
        liveNpc.behaviorState = 'idle';
        liveNpc.idleWaitTimer = 2.0 + Math.random() * 3.0;
        liveNpc.sprite.setPosition(active.x, active.y);
        liveNpc.sprite.setVelocity(0, 0);
        liveNpc.badgeContainer.setPosition(active.x, active.y - 32);
        liveNpc.interactionPoint.x = active.x;
        liveNpc.interactionPoint.y = active.y;
        liveNpc.sprite.setDepth(active.y);
        liveNpc.badgeContainer.setDepth(active.y + 10);
        liveNpc.sprite.anims.stop();
        liveNpc.facing = 'down';
        liveNpc.sprite.setFrame(getIdleFrameForFacing(liveNpc.data.sprite_key, 'down'));
      } else if (scheduleSlotChanged) {
        // Natural transition to a new routine zone
        liveNpc.anchorX = active.x;
        liveNpc.anchorY = active.y;
        liveNpc.targetX = active.x;
        liveNpc.targetY = active.y;
        liveNpc.behaviorState = 'traveling';
      }
    }

    this.broadcastState(true);
  }

  public teleportTo(x: number, y: number) {
    if (!this.player) return;
    this.player.setPosition(x, y + 24);
    this.cameras.main.pan(x, y + 24, 400, 'Sine.easeInOut');
  }

  public commandFollowPlayer(npcId: string): boolean {
    const liveNpc = this.liveNPCs.get(npcId);
    if (!liveNpc) return false;

    // If another NPC was following, revert that NPC to idle
    if (this.followingNpcId && this.followingNpcId !== npcId) {
      const prev = this.liveNPCs.get(this.followingNpcId);
      if (prev) {
        prev.behaviorState = 'idle';
        prev.activityText.setText(prev.currentScheduleEntry.activity.replace(/_/g, ' '));
        prev.activityText.setColor('#93C476');
      }
    }

    this.followingNpcId = npcId;
    liveNpc.behaviorState = 'following';
    liveNpc.activityText.setText('🐾 Following You');
    liveNpc.activityText.setColor('#F4D477');
    sound.playInteractClick();
    this.broadcastState(true);
    return true;
  }

  public commandStopFollowing(npcId?: string): boolean {
    const targetId = npcId || this.followingNpcId;
    if (!targetId) return false;

    const liveNpc = this.liveNPCs.get(targetId);
    if (liveNpc) {
      liveNpc.behaviorState = 'idle';
      liveNpc.sprite.setVelocity(0, 0);
      liveNpc.sprite.anims.stop();
      liveNpc.activityText.setText(liveNpc.currentScheduleEntry.activity.replace(/_/g, ' '));
      liveNpc.activityText.setColor('#93C476');
    }

    this.followingNpcId = null;
    sound.playInteractClick();
    this.broadcastState(true);
    return true;
  }

  public getFollowingNpcId(): string | null {
    return this.followingNpcId;
  }

  public triggerActiveInteraction() {
    if (!this.activeInteraction || this.isTransitioning) return;

    // Check if entering a building interior
    if (this.activeInteraction.type === 'door' && this.activeInteraction.targetInterior) {
      this.enterBuilding(this.activeInteraction.targetInterior);
      return;
    }

    if (this.activeInteraction.id === 'secret_chest' && !this.chestOpened) {
      this.chestOpened = true;
      this.activeInteraction.opened = true;
      this.activeInteraction.title = 'Ancient Village Compass Found!';
      this.activeInteraction.description =
        'You opened the chest and found a polished brass surveyor compass engraved: "Property of Kaveripura Founders - 1924".';
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

    this.broadcastState(true);
  }

  public enterBuilding(buildingId: InteriorType) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    sound.playFootstep();
    this.cameras.main.fadeOut(200, 15, 23, 18);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('InteriorScene', {
        buildingId,
        returnPos: { x: this.player.x, y: this.player.y + 16 },
        onStateChange: this.onStateChange,
      });
    });
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

  public getNpcWorldStates(): NPCWorldState[] {
    const list: NPCWorldState[] = [];
    for (const liveNpc of this.liveNPCs.values()) {
      if (liveNpc.interactionPoint.npcData) {
        list.push({ ...liveNpc.interactionPoint.npcData });
      }
    }
    return list;
  }

  private broadcastState(force: boolean = false, isMoving: boolean = false, isSprinting: boolean = false) {
    if (!this.onStateChange || !this.player) return;

    const now = Date.now();
    const px = Math.round(this.player.x);
    const py = Math.round(this.player.y);
    const zone = this.getCurrentZoneName();
    const interactionId = this.activeInteraction ? this.activeInteraction.id : null;

    const interactionChanged = interactionId !== this.lastActiveInteractionId;
    const zoneChanged = zone !== this.lastZone;
    const movedSignificantly = Math.abs(px - this.lastPlayerX) > 2 || Math.abs(py - this.lastPlayerY) > 2;
    const timeToThrottle = now - this.lastBroadcastTime > 800;

    if (!force && !interactionChanged && !zoneChanged && !movedSignificantly && !timeToThrottle) {
      return;
    }

    this.lastBroadcastTime = now;
    this.lastPlayerX = px;
    this.lastPlayerY = py;
    this.lastZone = zone;
    this.lastActiveInteractionId = interactionId;

    this.onStateChange({
      playerX: px,
      playerY: py,
      currentZone: zone,
      isMoving,
      isSprinting,
      activeInteraction: this.activeInteraction ? { ...this.activeInteraction } : null,
      isInsideInterior: false,
      interiorId: null,
      gameTime: formatMinutesToTime(this.gameTimeMinutes),
      gameTimeMinutes: this.gameTimeMinutes,
      npcs: this.getNpcWorldStates(),
      followingNpcId: this.followingNpcId,
    });
  }

  update(time: number, delta: number) {
    if (!this.player || !this.player.body || this.isTransitioning) return;

    const dt = delta / 1000; // Delta in seconds

    // Advance clock at a calm, relaxed pace (1 game minute every 4 real seconds)
    if (this.isClockRunning) {
      this.clockAccumulator += delta;
      if (this.clockAccumulator >= 4000) {
        this.clockAccumulator = 0;
        this.setGameTime(this.gameTimeMinutes + 1, false);
      }
    }

    // Update Live NPCs: Casual, Peaceful Local Roaming & Scheduled Pathing
    const CASUAL_WANDER_SPEED = 34; // Gentle, slow village walking speed
    const TRAVEL_SPEED = 48; // Calm transit speed when changing scheduled zones

    for (const liveNpc of this.liveNPCs.values()) {
      const distToPlayer = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        liveNpc.sprite.x,
        liveNpc.sprite.y
      );

      // 1. Tool Use: NPC is actively following player as a companion
      if (liveNpc.data.id === this.followingNpcId || liveNpc.behaviorState === 'following') {
        const dx = this.player.x - liveNpc.sprite.x;
        const dy = this.player.y - liveNpc.sprite.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 48) {
          const isSprinting = Boolean(
            (this.wasd?.sprint && this.wasd.sprint.isDown) ||
            (this.cursors?.shift && this.cursors.shift.isDown)
          );
          const followSpeed = isSprinting ? 140 : 92;
          const vx = (dx / dist) * followSpeed;
          const vy = (dy / dist) * followSpeed;
          liveNpc.sprite.setVelocity(vx, vy);

          const tex = liveNpc.data.sprite_key;
          if (Math.abs(vx) > Math.abs(vy)) {
            liveNpc.facing = vx > 0 ? 'right' : 'left';
            liveNpc.sprite.anims.play(`${tex}-walk-${liveNpc.facing}`, true);
          } else {
            liveNpc.facing = vy > 0 ? 'down' : 'up';
            liveNpc.sprite.anims.play(`${tex}-walk-${liveNpc.facing}`, true);
          }
        } else {
          // Within companion range: stop smoothly and face player
          liveNpc.sprite.setVelocity(0, 0);
          liveNpc.sprite.anims.stop();
          if (Math.abs(dx) > Math.abs(dy)) {
            liveNpc.facing = dx > 0 ? 'right' : 'left';
          } else {
            liveNpc.facing = dy > 0 ? 'down' : 'up';
          }
          liveNpc.sprite.setFrame(getIdleFrameForFacing(liveNpc.data.sprite_key, liveNpc.facing));
        }
      } else if (distToPlayer <= 38) {
        // If player is speaking / right next to NPC, NPC stops and politely faces player
        liveNpc.sprite.setVelocity(0, 0);
        liveNpc.sprite.anims.stop();

        const dxP = this.player.x - liveNpc.sprite.x;
        const dyP = this.player.y - liveNpc.sprite.y;
        if (Math.abs(dxP) > Math.abs(dyP)) {
          liveNpc.facing = dxP > 0 ? 'right' : 'left';
        } else {
          liveNpc.facing = dyP > 0 ? 'down' : 'up';
        }
        liveNpc.sprite.setFrame(getIdleFrameForFacing(liveNpc.data.sprite_key, liveNpc.facing));
      } else if (liveNpc.behaviorState === 'idle') {
        // NPC is chilling in place
        liveNpc.sprite.setVelocity(0, 0);
        liveNpc.sprite.anims.stop();
        liveNpc.sprite.setFrame(getIdleFrameForFacing(liveNpc.data.sprite_key, liveNpc.facing));

        liveNpc.idleWaitTimer -= dt;

        if (liveNpc.idleWaitTimer <= 0) {
          const distToAnchor = Phaser.Math.Distance.Between(
            liveNpc.sprite.x,
            liveNpc.sprite.y,
            liveNpc.anchorX,
            liveNpc.anchorY
          );

          if (distToAnchor > 55) {
            // Roamed too far from anchor; head back gently
            liveNpc.targetX = liveNpc.anchorX + (Math.random() - 0.5) * 16;
            liveNpc.targetY = liveNpc.anchorY + (Math.random() - 0.5) * 16;
            liveNpc.behaviorState = 'wandering';
          } else {
            // 65% chance: Pick a slow, short stroll nearby (15 - 38 px away)
            if (Math.random() < 0.65) {
              const angle = Math.random() * Math.PI * 2;
              const r = 12 + Math.random() * 26;
              liveNpc.targetX = Math.round(liveNpc.anchorX + Math.cos(angle) * r);
              liveNpc.targetY = Math.round(liveNpc.anchorY + Math.sin(angle) * r);
              liveNpc.behaviorState = 'wandering';
            } else {
              // 35% chance: Just look around casually and wait another 3-5 seconds
              const facings: Array<'down' | 'left' | 'right' | 'up'> = ['down', 'left', 'right', 'down'];
              liveNpc.facing = facings[Math.floor(Math.random() * facings.length)];
              liveNpc.sprite.setFrame(getIdleFrameForFacing(liveNpc.data.sprite_key, liveNpc.facing));
              liveNpc.idleWaitTimer = 3.0 + Math.random() * 4.0;
            }
          }
        }
      } else {
        // NPC is walking (wandering casually or traveling to new scheduled zone)
        const dx = liveNpc.targetX - liveNpc.sprite.x;
        const dy = liveNpc.targetY - liveNpc.sprite.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= 3) {
          // Arrived at destination! Stop and pause casually
          liveNpc.sprite.setPosition(liveNpc.targetX, liveNpc.targetY);
          liveNpc.sprite.setVelocity(0, 0);
          liveNpc.sprite.anims.stop();
          liveNpc.sprite.setFrame(getIdleFrameForFacing(liveNpc.data.sprite_key, liveNpc.facing));
          liveNpc.behaviorState = 'idle';
          liveNpc.idleWaitTimer = 4.0 + Math.random() * 4.0; // 4 to 8 seconds of relaxed idle pause
        } else {
          const moveSpeed = liveNpc.behaviorState === 'traveling' ? TRAVEL_SPEED : CASUAL_WANDER_SPEED;
          const vx = (dx / dist) * moveSpeed;
          const vy = (dy / dist) * moveSpeed;
          liveNpc.sprite.setVelocity(vx, vy);

          const tex = liveNpc.data.sprite_key;
          if (Math.abs(vx) > Math.abs(vy)) {
            liveNpc.facing = vx > 0 ? 'right' : 'left';
            liveNpc.sprite.anims.play(`${tex}-walk-${liveNpc.facing}`, true);
          } else {
            liveNpc.facing = vy > 0 ? 'down' : 'up';
            liveNpc.sprite.anims.play(`${tex}-walk-${liveNpc.facing}`, true);
          }
        }
      }

      // Sync badge container, interaction point & depth sorting
      liveNpc.badgeContainer.setPosition(liveNpc.sprite.x, liveNpc.sprite.y - 32);
      liveNpc.interactionPoint.x = liveNpc.sprite.x;
      liveNpc.interactionPoint.y = liveNpc.sprite.y;
      liveNpc.sprite.setDepth(liveNpc.sprite.y);
      liveNpc.badgeContainer.setDepth(liveNpc.sprite.y + 10);

      if (liveNpc.interactionPoint.npcData) {
        liveNpc.interactionPoint.npcData.x = Math.round(liveNpc.sprite.x);
        liveNpc.interactionPoint.npcData.y = Math.round(liveNpc.sprite.y);
      }
    }

    // Player Movement
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

    this.player.setDepth(this.player.y);

    // Proximity Interaction Detection
    let nearest: InteractionPoint | null = null;
    let minDistance = 999999;

    for (const point of this.interactionPoints) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y);
      if (dist <= point.radius && dist < minDistance) {
        minDistance = dist;
        nearest = {
          ...point,
          distanceToPlayer: Math.round(dist),
          isWithinTalkRadius: true,
        };
      }
    }

    const interactionChanged = (this.activeInteraction?.id ?? null) !== (nearest?.id ?? null);
    this.activeInteraction = nearest;

    if (interactionChanged && nearest) {
      sound.playChime();
    }

    this.broadcastState(false, isMoving, isSprinting);
  }
}
