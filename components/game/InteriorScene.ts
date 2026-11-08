import Phaser from 'phaser';
import { InteriorType, InteractionPoint, GameStateEvent, NPCWorldState } from './types';
import { sound } from './audio';
import {
  DroppedWorldItem,
  loadDroppedItems,
  removeDroppedItem,
  getCatalogItem,
  addItemToInventory,
  loadPlayerInventory,
} from '@/lib/inventory';
import {
  NPCDataTemplate,
  GAME_NPC_LIST,
  NPC_SPRITE_CONFIGS,
  getIdleFrameForFacing,
} from './npcData';
import { getNpcLocations, setNpcLocation, RESIDENT_NPC_BUILDINGS } from '@/lib/npcLocations';

interface LiveDroppedItem {
  data: DroppedWorldItem;
  container: Phaser.GameObjects.Container;
  tween: Phaser.Tweens.Tween;
}

interface LiveNPCEntity {
  data: NPCDataTemplate;
  sprite: Phaser.Physics.Arcade.Sprite;
  badgeContainer: Phaser.GameObjects.Container;
  nameText: Phaser.GameObjects.Text;
  activityText: Phaser.GameObjects.Text;
  anchorX: number;
  anchorY: number;
  targetX: number;
  targetY: number;
  behaviorState: 'idle' | 'wandering' | 'talking' | 'following';
  idleWaitTimer: number;
  facing: 'down' | 'left' | 'right' | 'up';
  interactionPoint: InteractionPoint;
}

export interface InteriorSceneInitData {
  buildingId: InteriorType;
  returnPos?: { x: number; y: number };
  onStateChange?: (event: GameStateEvent) => void;
  followingNpcId?: string | null;
}

export class InteriorScene extends Phaser.Scene {
  private buildingId: InteriorType = 'player_home';
  private returnPos: { x: number; y: number } = { x: 336, y: 350 };
  private onStateChange?: (event: GameStateEvent) => void;

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
  private liveNPCs: Map<string, LiveNPCEntity> = new Map();
  private npcGroup!: Phaser.Physics.Arcade.Group;
  private followingNpcId: string | null = null;
  private lastFacing: 'down' | 'left' | 'right' | 'up' = 'up';
  private interactionPoints: InteractionPoint[] = [];
  private activeInteraction: InteractionPoint | null = null;
  private isExiting = false;

  private droppedItems: Map<string, LiveDroppedItem> = new Map();
  private boundDroppedItemsListener?: () => void;

  private roomWidth = 512;
  private roomHeight = 384;
  private exitBounds = { x1: 226, x2: 286, y1: 345, y2: 380 };

  constructor() {
    super({ key: 'InteriorScene' });
  }

  public init(data: InteriorSceneInitData) {
    this.buildingId = data.buildingId || 'player_home';
    this.returnPos = data.returnPos || { x: 336, y: 350 };
    this.onStateChange = data.onStateChange;
    this.followingNpcId = data.followingNpcId ?? this.followingNpcId ?? null;
    this.isExiting = false;
    this.liveNPCs.clear();
    this.interactionPoints = [];
    this.activeInteraction = null;
  }

  preload() {
    this.load.image('room_player_home', '/assets/interiors/room_player_home.png');
    this.load.image('room_hospital', '/assets/interiors/room_hospital.png');
    this.load.image('room_shop', '/assets/interiors/room_shop.png');
    this.load.image('room_workshop', '/assets/interiors/room_workshop.png');

    this.load.spritesheet('player', '/assets/characters/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Preload NPC Character Spritesheets
    for (const key of Object.keys(NPC_SPRITE_CONFIGS)) {
      const cfg = NPC_SPRITE_CONFIGS[key];
      if (!this.textures.exists(cfg.textureKey)) {
        this.load.spritesheet(cfg.textureKey, cfg.imagePath, {
          frameWidth: cfg.frameWidth,
          frameHeight: cfg.frameHeight,
        });
      }
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#0F1712');
    this.cameras.main.fadeIn(250, 15, 23, 18);

    this.obstacleGroup = this.physics.add.staticGroup();

    let bgKey = 'room_player_home';
    let spawnX = 256;
    let spawnY = 320;
    let zoom = 2.0;

    if (this.buildingId === 'hospital') {
      bgKey = 'room_hospital';
      this.roomWidth = 512;
      this.roomHeight = 384;
      spawnX = 256;
      spawnY = 320;
      this.exitBounds = { x1: 226, x2: 286, y1: 345, y2: 380 };
      this.setupHospitalObstacles();
      this.setupHospitalInteractions();
    } else if (this.buildingId === 'shop') {
      bgKey = 'room_shop';
      this.roomWidth = 512;
      this.roomHeight = 384;
      spawnX = 256;
      spawnY = 320;
      this.exitBounds = { x1: 226, x2: 286, y1: 345, y2: 380 };
      this.setupShopObstacles();
      this.setupShopInteractions();
    } else if (this.buildingId === 'workshop') {
      bgKey = 'room_workshop';
      this.roomWidth = 800;
      this.roomHeight = 512;
      spawnX = 400;
      spawnY = 440;
      zoom = 1.7;
      this.exitBounds = { x1: 360, x2: 440, y1: 470, y2: 512 };
      this.setupWorkshopObstacles();
      this.setupWorkshopInteractions();
    } else {
      // player_home
      bgKey = 'room_player_home';
      this.roomWidth = 512;
      this.roomHeight = 384;
      spawnX = 256;
      spawnY = 320;
      this.exitBounds = { x1: 226, x2: 286, y1: 345, y2: 380 };
      this.setupPlayerHomeObstacles();
      this.setupPlayerHomeInteractions();
    }

    this.physics.world.setBounds(0, 0, this.roomWidth, this.roomHeight);

    // Background Room Sprite
    const bg = this.add.image(this.roomWidth / 2, this.roomHeight / 2, bgKey);
    bg.setDepth(0);

    // Always add the Exit Doorway interaction point at the bottom
    const exitCenterX = (this.exitBounds.x1 + this.exitBounds.x2) / 2;
    const exitCenterY = (this.exitBounds.y1 + this.exitBounds.y2) / 2;
    this.interactionPoints.push({
      id: 'exit_door',
      name: 'Exit to Village',
      type: 'exit_door',
      x: exitCenterX,
      y: exitCenterY,
      radius: 40,
      title: 'Village Threshold',
      description: 'Step outside back into Kaveripura village square.',
      actionLabel: 'Leave Building',
    });

    // Exit threshold visual pulse indicator
    const exitIndicator = this.add.rectangle(
      exitCenterX,
      this.exitBounds.y1 + 10,
      this.exitBounds.x2 - this.exitBounds.x1,
      14,
      0xf4d477,
      0.25
    );
    exitIndicator.setDepth(1);
    this.tweens.add({
      targets: exitIndicator,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Outer Room Wall Colliders
    this.createStaticCollider(this.roomWidth / 2, 40, this.roomWidth, 80); // North wall
    this.createStaticCollider(8, this.roomHeight / 2, 16, this.roomHeight); // Left wall
    this.createStaticCollider(this.roomWidth - 8, this.roomHeight / 2, 16, this.roomHeight); // Right wall

    // Bottom Wall with doorway gap
    const leftBottomWidth = this.exitBounds.x1;
    const rightBottomWidth = this.roomWidth - this.exitBounds.x2;
    this.createStaticCollider(leftBottomWidth / 2, this.roomHeight - 8, leftBottomWidth, 16);
    this.createStaticCollider(
      this.exitBounds.x2 + rightBottomWidth / 2,
      this.roomHeight - 8,
      rightBottomWidth,
      16
    );

    // Spawn Player Character
    this.spawnPlayer(spawnX, spawnY);

    // Spawn Room NPCs (Residents + Following Companion)
    this.npcGroup = this.physics.add.group();
    this.setupNpcAnimations();
    this.spawnInteriorNPCs(spawnX, spawnY);

    this.physics.add.collider(this.player, this.obstacleGroup);
    this.physics.add.collider(this.player, this.npcGroup);
    this.physics.add.collider(this.npcGroup, this.obstacleGroup);

    // Setup Camera
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, this.roomWidth, this.roomHeight);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.roundPixels = true;

    // Inputs
    this.setupInputs();

    this.scale.on('resize', this.handleResize, this);

    // Dropped Items in Interior Room
    this.syncDroppedItemsFromStorage();
    if (typeof window !== 'undefined') {
      this.boundDroppedItemsListener = () => this.syncDroppedItemsFromStorage();
      window.addEventListener('jeeva:dropped-items-updated', this.boundDroppedItemsListener);
      this.events.once('shutdown', () => {
        if (this.boundDroppedItemsListener) {
          window.removeEventListener('jeeva:dropped-items-updated', this.boundDroppedItemsListener);
        }
      });
    }
  }

  public syncDroppedItemsFromStorage(): void {
    if (typeof window === 'undefined') return;
    const currentDrops = loadDroppedItems().filter((d) => d.scene === this.buildingId);
    const dropIds = new Set(currentDrops.map((d) => d.id));

    for (const [id, liveDrop] of this.droppedItems.entries()) {
      if (!dropIds.has(id)) {
        liveDrop.tween?.stop();
        liveDrop.container.destroy();
        this.droppedItems.delete(id);
      }
    }

    for (const drop of currentDrops) {
      if (!this.droppedItems.has(drop.id)) {
        this.spawnDroppedItemVisual(drop);
      }
    }
  }

  private spawnDroppedItemVisual(drop: DroppedWorldItem): void {
    const catalogItem = getCatalogItem(drop.itemId);
    if (!catalogItem) return;

    const container = this.add.container(drop.x, drop.y);
    container.setDepth(drop.y + 5);

    const shadow = this.add.ellipse(0, 8, 16, 7, 0x000000, 0.45);
    const iconText = this.add.text(0, -4, catalogItem.icon, {
      fontSize: '18px',
    }).setOrigin(0.5);

    const nameTag = this.add.text(
      0,
      13,
      drop.quantity > 1 ? `${catalogItem.name} x${drop.quantity}` : catalogItem.name,
      {
        fontSize: '8px',
        fontFamily: 'Courier, monospace',
        color: '#F4D477',
        backgroundColor: 'rgba(15, 23, 18, 0.85)',
        padding: { x: 3, y: 1 },
      }
    ).setOrigin(0.5);

    container.add([shadow, iconText, nameTag]);

    const tween = this.tweens.add({
      targets: iconText,
      y: -8,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.droppedItems.set(drop.id, {
      data: drop,
      container,
      tween,
    });
  }

  private handleResize() {
    this.cameras.main.setSize(this.scale.width, this.scale.height);
  }

  private createStaticCollider(x: number, y: number, width: number, height: number) {
    const col = this.obstacleGroup.create(x, y, undefined, undefined, false) as Phaser.Physics.Arcade.Sprite;
    col.setSize(width, height);
    col.setVisible(false);
    return col;
  }

  private setupPlayerHomeObstacles() {
    // Bed (top-right)
    this.createStaticCollider(440, 75, 75, 90);
    // Bookshelf (top-left)
    this.createStaticCollider(80, 50, 75, 50);
    // Fireplace (center-north)
    this.createStaticCollider(256, 50, 75, 50);
    // Dining Table (center)
    this.createStaticCollider(260, 220, 72, 40);
    // Wardrobe (bottom-right)
    this.createStaticCollider(445, 240, 60, 95);
  }

  private setupPlayerHomeInteractions() {
    this.interactionPoints.push(
      {
        id: 'home_hearth',
        name: 'Warm Stone Hearth',
        type: 'inspect',
        x: 256,
        y: 85,
        radius: 46,
        title: 'Stone Hearth & Fireplace',
        description: 'Warm glowing hearth crackling with mountain cedar wood. Keeps your cottage cozy during chilly evenings.',
        actionLabel: 'Warm Hands',
      },
      {
        id: 'home_bed',
        name: 'Cozy Quilted Bed',
        type: 'inspect',
        x: 430,
        y: 120,
        radius: 48,
        title: 'Player Quilted Bed',
        description: 'Handcrafted wooden bed with fluffy down pillows and red quilt. A comforting sanctuary to restore your energy.',
        actionLabel: 'Rest',
      },
      {
        id: 'home_bookshelf',
        name: 'Ancient Chronicles',
        type: 'inspect',
        x: 80,
        y: 90,
        radius: 46,
        title: 'Bookshelf & Village Lore',
        description: 'Bound parchment detailing Kaveripura folklore, monsoon agricultural calendars, and ancestral herb journals.',
        actionLabel: 'Browse Books',
      },
      {
        id: 'home_table',
        name: 'Dining Table',
        type: 'inspect',
        x: 260,
        y: 220,
        radius: 46,
        title: 'Polished Dining Table',
        description: 'Carved cedar dining table with steaming earthen teapot and two wooden chairs.',
        actionLabel: 'Sit Down',
      }
    );
  }

  private setupHospitalObstacles() {
    // Left Patient Bed
    this.createStaticCollider(80, 190, 65, 95);
    // Right Patient Bed
    this.createStaticCollider(430, 190, 65, 95);
    // Examination Table (center)
    this.createStaticCollider(256, 185, 75, 65);
    // Dr. Priya's Desk
    this.createStaticCollider(255, 285, 105, 45);
    // Supply Cabinets
    this.createStaticCollider(75, 50, 70, 55);
    this.createStaticCollider(435, 50, 70, 55);
  }

  private setupHospitalInteractions() {
    this.interactionPoints.push(
      {
        id: 'hospital_cabinet',
        name: 'Medicine Cabinet',
        type: 'inspect',
        x: 75,
        y: 90,
        radius: 48,
        title: 'Apothecary & Antiseptics',
        description: 'Neatly organized glass jars of tulsi extract, neem ointments, clean cotton bandages, and pain-relief tinctures.',
        actionLabel: 'Inspect Medicines',
      },
      {
        id: 'hospital_exam',
        name: 'Examination Table',
        type: 'inspect',
        x: 256,
        y: 190,
        radius: 48,
        title: 'Examination Table',
        description: 'Sanitized clinical table where Dr. Priya examines injured villagers and monitors vital recovery stats.',
        actionLabel: 'Inspect Bed',
      },
      {
        id: 'hospital_desk',
        name: "Dr. Priya's Desk",
        type: 'inspect',
        x: 255,
        y: 285,
        radius: 48,
        title: "Dr. Priya's Consultation Desk",
        description: 'Patient case charts, herbal formula notes, and brass stethoscope resting on an orderly mahogany desk.',
        actionLabel: 'Read Case Notes',
      },
      {
        id: 'hospital_recovery',
        name: 'Recovery Bed',
        type: 'inspect',
        x: 430,
        y: 200,
        radius: 48,
        title: 'Inpatient Recovery Bed',
        description: 'Clean linens and warm wool blankets prepared for villagers recovering from the monsoon storm.',
        actionLabel: 'Check Linen',
      }
    );
  }

  private setupShopObstacles() {
    // Checkout Counter
    this.createStaticCollider(255, 185, 225, 46);
    // Produce Baskets (left)
    this.createStaticCollider(72, 180, 60, 115);
    // Barrels & Sacks (right)
    this.createStaticCollider(440, 200, 60, 150);
  }

  private setupShopInteractions() {
    this.interactionPoints.push(
      {
        id: 'shop_counter',
        name: 'Checkout Counter',
        type: 'inspect',
        x: 255,
        y: 215,
        radius: 48,
        title: "Dev's Merchant Counter",
        description: 'Iron cashbox, brass weight scales, and Dev\'s trade ledger recording village supplies and barters.',
        actionLabel: 'Check Ledger',
      },
      {
        id: 'shop_shelves',
        name: 'Store Shelves',
        type: 'inspect',
        x: 255,
        y: 90,
        radius: 52,
        title: 'Wall Provision Shelves',
        description: 'Rows of spice tins, apothecary flasks, honey jars, ropes, lantern oil, and imported dried fruits.',
        actionLabel: 'Browse Goods',
      },
      {
        id: 'shop_produce',
        name: 'Fresh Farm Produce',
        type: 'inspect',
        x: 72,
        y: 180,
        radius: 48,
        title: 'Produce Display Crates',
        description: 'Wicker baskets loaded with crisp orchard apples, fresh carrots, and farm cabbages brought by Ravi.',
        actionLabel: 'Inspect Produce',
      },
      {
        id: 'shop_barrels',
        name: 'Grain & Salt Barrels',
        type: 'inspect',
        x: 440,
        y: 200,
        radius: 48,
        title: 'Bulk Storage Barrels',
        description: 'Oak barrels packed with coarse sea salt, milled wheat flour, and burlap sacks of roasted lentils.',
        actionLabel: 'Inspect Barrels',
      }
    );
  }

  private setupWorkshopObstacles() {
    // North wall machinery
    this.createStaticCollider(400, 70, 760, 120);
    // Left workbench
    this.createStaticCollider(200, 220, 160, 80);
    // Right generator workbench
    this.createStaticCollider(600, 220, 160, 80);
    // Scrap piles
    this.createStaticCollider(180, 360, 100, 80);
  }

  private setupWorkshopInteractions() {
    this.interactionPoints.push(
      {
        id: 'workshop_bench',
        name: 'Tool Workbench',
        type: 'inspect',
        x: 220,
        y: 220,
        radius: 52,
        title: 'Fabrication Workbench',
        description: 'Heavy steel vice, socket wrench sets, copper wire spools, and schematics for rebuilding irrigation levees.',
        actionLabel: 'Inspect Tools',
      },
      {
        id: 'workshop_generator',
        name: 'Auxiliary Generator',
        type: 'inspect',
        x: 600,
        y: 220,
        radius: 52,
        title: 'Village Diesel Generator',
        description: 'The backup electrical generator powering the clinic refrigeration unit. Currently waiting for copper coils.',
        actionLabel: 'Check Engine',
      },
      {
        id: 'workshop_scrap',
        name: 'Metal Scrap Pile',
        type: 'inspect',
        x: 180,
        y: 360,
        radius: 50,
        title: 'Salvaged Machine Parts',
        description: 'Cast iron gears, drive shafts, and brass fittings ready to be recycled into useful village tools.',
        actionLabel: 'Scavenge Parts',
      }
    );
  }

  private spawnPlayer(x: number, y: number) {
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

    this.player = this.physics.add.sprite(x, y, 'player', 10); // initial frame facing up
    this.player.setOrigin(0.5, 0.7);
    this.player.body?.setSize(16, 16);
    this.player.body?.setOffset(8, 16);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(y);
    this.lastFacing = 'up';
  }

  private currentZoom = 2.0;

  public cycleZoom() {
    if (this.currentZoom === 1.6) this.currentZoom = 2.0;
    else if (this.currentZoom === 2.0) this.currentZoom = 2.5;
    else this.currentZoom = 1.6;

    this.cameras.main.zoomTo(this.currentZoom, 300, 'Sine.easeInOut');
  }

  public setZoomLevel(zoom: number) {
    this.currentZoom = zoom;
    this.cameras.main.zoomTo(this.currentZoom, 300, 'Sine.easeInOut');
  }

  private setupInputs() {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    // Do not capture Space or E in Phaser so window can handle voice push-to-talk and inventory cleanly
    this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.E);
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      sprint: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      interact: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
    };

    this.input.keyboard.on('keydown-F', () => {
      this.triggerActiveInteraction();
    });
    this.input.keyboard.on('keydown-Z', () => {
      this.cycleZoom();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-F');
      this.input.keyboard?.off('keydown-Z');
      this.scale.off('resize', this.handleResize, this);
    });
  }

  public triggerActiveInteraction() {
    if (!this.activeInteraction || this.isExiting) return;

    if (this.activeInteraction.type === 'exit_door') {
      this.exitToVillage();
      return;
    }

    sound.playInteractClick();

    if (this.onStateChange) {
      this.onStateChange({
        playerX: Math.round(this.player.x),
        playerY: Math.round(this.player.y),
        currentZone: this.getRoomZoneName(),
        isMoving: false,
        isSprinting: false,
        activeInteraction: { ...this.activeInteraction },
        isInsideInterior: true,
        interiorId: this.buildingId,
      });
    }
  }

  public exitToVillage() {
    if (this.isExiting) return;
    this.isExiting = true;

    // If an NPC is following the player, mark their location as 'village'
    if (this.followingNpcId) {
      setNpcLocation(this.followingNpcId, 'village');
    }

    sound.playFootstep();
    this.cameras.main.fadeOut(200, 15, 23, 18);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('VillageScene', {
        returnPos: this.returnPos,
        onStateChange: this.onStateChange,
        followingNpcId: this.followingNpcId,
      });
    });
  }

  private setupNpcAnimations() {
    for (const key of Object.keys(NPC_SPRITE_CONFIGS)) {
      const cfg = NPC_SPRITE_CONFIGS[key];
      const tex = cfg.textureKey;

      if (!this.anims.exists(`${tex}-walk-down`)) {
        this.anims.create({
          key: `${tex}-walk-down`,
          frames: this.anims.generateFrameNumbers(tex, { frames: cfg.walkDown }),
          frameRate: 6,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`${tex}-walk-left`)) {
        this.anims.create({
          key: `${tex}-walk-left`,
          frames: this.anims.generateFrameNumbers(tex, { frames: cfg.walkLeft }),
          frameRate: 6,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`${tex}-walk-right`)) {
        this.anims.create({
          key: `${tex}-walk-right`,
          frames: this.anims.generateFrameNumbers(tex, { frames: cfg.walkRight }),
          frameRate: 6,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`${tex}-walk-up`)) {
        this.anims.create({
          key: `${tex}-walk-up`,
          frames: this.anims.generateFrameNumbers(tex, { frames: cfg.walkUp }),
          frameRate: 6,
          repeat: -1,
        });
      }
    }
  }

  private spawnInteriorNPCs(spawnX: number, spawnY: number) {
    const locations = getNpcLocations();

    // 1. If an NPC companion was following the player into this building, spawn them near the doorway
    if (this.followingNpcId) {
      const followTemplate = GAME_NPC_LIST.find((n) => n.id === this.followingNpcId);
      if (followTemplate) {
        const compX = Math.max(30, Math.min(this.roomWidth - 30, spawnX + 28));
        const compY = spawnY;
        this.spawnNpcInRoom(followTemplate, compX, compY, true, '🐾 Following You');
      }
    }

    // 2. Identify resident NPC for this building
    let residentId: string | null = null;
    let rx = 256;
    let ry = 200;
    let rActivity = 'Resting';

    if (this.buildingId === 'player_home') {
      residentId = 'priya_wife';
      rx = 210;
      ry = 160; // Cozy near dining table and hearth
      rActivity = 'Wife';
    } else if (this.buildingId === 'shop') {
      residentId = 'dev_shopkeeper';
      rx = 255;
      ry = 150; // Standing behind checkout counter
      rActivity = 'Tending General Store';
    } else if (this.buildingId === 'workshop') {
      residentId = 'arjun_mechanic';
      rx = 240;
      ry = 180; // Beside fabrication workbench
      rActivity = 'Tinkering at Workbench';
    }

    // 3. Spawn resident NPC if stationed here and not already spawned as the following companion
    if (residentId && (!this.followingNpcId || this.followingNpcId !== residentId)) {
      const loc = locations[residentId] || (residentId in RESIDENT_NPC_BUILDINGS ? RESIDENT_NPC_BUILDINGS[residentId] : 'village');
      if (loc === this.buildingId) {
        const template = GAME_NPC_LIST.find((n) => n.id === residentId);
        if (template) {
          this.spawnNpcInRoom(template, rx, ry, false, rActivity);
        }
      }
    }
  }

  private spawnNpcInRoom(
    template: NPCDataTemplate,
    x: number,
    y: number,
    isFollowing: boolean,
    activityLabel: string
  ) {
    const cfg = NPC_SPRITE_CONFIGS[template.sprite_key] || NPC_SPRITE_CONFIGS.character_14;
    const initialFacing: 'down' | 'left' | 'right' | 'up' = isFollowing ? 'up' : 'down';
    const initialFrame = getIdleFrameForFacing(template.sprite_key, initialFacing);

    const sprite = this.physics.add.sprite(x, y, cfg.textureKey, initialFrame);
    sprite.setOrigin(0.5, 0.7);
    sprite.body?.setSize(16, 16);
    sprite.body?.setOffset(8, 16);
    sprite.setCollideWorldBounds(true);
    sprite.setDepth(y);
    sprite.setImmovable(!isFollowing);

    const badgeContainer = this.add.container(x, y - 32);

    const nameText = this.add.text(0, -9, template.name, {
      fontSize: '11px',
      fontFamily: 'Pixelify Sans, monospace',
      color: '#F4D477',
      stroke: '#14271A',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const activityText = this.add.text(
      0,
      5,
      isFollowing ? '🐾 Following You' : `[${activityLabel}]`,
      {
        fontSize: '9px',
        fontFamily: 'Nunito, sans-serif',
        color: isFollowing ? '#F4D477' : '#E5F0D9',
        backgroundColor: '#14271AEE',
        padding: { x: 4, y: 1 },
      }
    ).setOrigin(0.5);

    badgeContainer.add([nameText, activityText]);
    badgeContainer.setDepth(y + 10);

    const interactionPoint: InteractionPoint = {
      id: `npc_${template.id}`,
      name: template.name,
      type: 'npc',
      x,
      y,
      radius: 48,
      title: `${template.name} — ${template.role}`,
      description: isFollowing
        ? `${template.name} is currently following you.`
        : `${template.bio}\n\nSpeaking style: ${template.speaking_style}`,
      actionLabel: 'Talk with (Voice / Text)',
      npcData: {
        id: template.id,
        name: template.name,
        role: template.role,
        spriteKey: template.sprite_key,
        spriteSrc: cfg.imagePath,
        homeZone: template.home_zone,
        currentZone: this.getRoomZoneName(),
        x,
        y,
        activity: isFollowing ? 'following_player' : activityLabel.toLowerCase().replace(/\s+/g, '_'),
        activityLabel: isFollowing ? 'Following You' : activityLabel,
        activityDescription: isFollowing
          ? `${template.name} is closely following you.`
          : `${template.name} is stationed inside ${this.getRoomZoneName()}.`,
        timeSlot: 'Current',
        state: isFollowing ? 'walking' : 'idle',
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
      anchorX: x,
      anchorY: y,
      targetX: x,
      targetY: y,
      behaviorState: isFollowing ? 'following' : 'idle',
      idleWaitTimer: 3.0,
      facing: initialFacing,
      interactionPoint,
    });
  }

  public commandFollowPlayer(npcId: string): boolean {
    const liveNpc = this.liveNPCs.get(npcId);
    if (!liveNpc) return false;

    if (this.followingNpcId && this.followingNpcId !== npcId) {
      const prev = this.liveNPCs.get(this.followingNpcId);
      if (prev) {
        prev.behaviorState = 'idle';
        prev.activityText.setText('Resting');
        prev.activityText.setColor('#93C476');
        prev.sprite.setImmovable(true);
      }
    }

    this.followingNpcId = npcId;
    liveNpc.behaviorState = 'following';
    liveNpc.sprite.setImmovable(false);
    liveNpc.activityText.setText('🐾 Following You');
    liveNpc.activityText.setColor('#F4D477');
    if (liveNpc.interactionPoint.npcData) {
      liveNpc.interactionPoint.npcData.activity = 'following_player';
      liveNpc.interactionPoint.npcData.activityLabel = 'Following You';
    }
    sound.playInteractClick();
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
      liveNpc.sprite.setImmovable(true);
      liveNpc.activityText.setText('Resting');
      liveNpc.activityText.setColor('#93C476');
      if (liveNpc.interactionPoint.npcData) {
        liveNpc.interactionPoint.npcData.activity = 'idle';
        liveNpc.interactionPoint.npcData.activityLabel = 'Resting';
      }
    }

    this.followingNpcId = null;
    sound.playInteractClick();
    return true;
  }

  public getFollowingNpcId(): string | null {
    return this.followingNpcId;
  }

  public despawnNpc(npcId: string): boolean {
    const liveNpc = this.liveNPCs.get(npcId);
    if (!liveNpc) return false;

    this.interactionPoints = this.interactionPoints.filter(
      (p) => p.id !== `npc_${npcId}` && p.id !== liveNpc.interactionPoint.id
    );
    if (this.activeInteraction?.id === `npc_${npcId}`) {
      this.activeInteraction = null;
    }
    if (this.followingNpcId === npcId) {
      this.followingNpcId = null;
    }

    this.tweens.add({
      targets: [liveNpc.sprite, liveNpc.badgeContainer],
      alpha: 0,
      duration: 500,
      onComplete: () => {
        liveNpc.badgeContainer.destroy();
        liveNpc.sprite.destroy();
      },
    });

    this.liveNPCs.delete(npcId);
    return true;
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

  private getRoomZoneName(): string {
    switch (this.buildingId) {
      case 'player_home':
        return "Inside Kushal's Cottage";
      case 'hospital':
        return "Inside Dr. Priya's Health Clinic";
      case 'shop':
        return "Inside Dev's General Store";
      case 'workshop':
        return "Inside Arjun's Mechanic Workshop";
      default:
        return 'Inside Building';
    }
  }

  update() {
    if (!this.player || !this.player.body || this.isExiting) return;

    // Check if player walked directly onto the exit threshold
    const px = this.player.x;
    const py = this.player.y;
    if (
      px >= this.exitBounds.x1 &&
      px <= this.exitBounds.x2 &&
      py >= this.exitBounds.y1 + 10 &&
      py <= this.exitBounds.y2
    ) {
      this.exitToVillage();
      return;
    }

    let vx = 0;
    let vy = 0;

    const isUp = this.cursors?.up?.isDown || this.wasd?.up?.isDown;
    const isDown = this.cursors?.down?.isDown || this.wasd?.down?.isDown;
    const isLeft = this.cursors?.left?.isDown || this.wasd?.left?.isDown;
    const isRight = this.cursors?.right?.isDown || this.wasd?.right?.isDown;
    const isSprinting = Boolean(this.cursors?.shift?.isDown || this.wasd?.sprint?.isDown);

    const baseSpeed = isSprinting ? 200 : 120;

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

    // Update Room NPCs (companion following, badge position, facing player)
    for (const liveNpc of this.liveNPCs.values()) {
      const distToPlayer = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        liveNpc.sprite.x,
        liveNpc.sprite.y
      );

      if (liveNpc.data.id === this.followingNpcId || liveNpc.behaviorState === 'following') {
        const dx = this.player.x - liveNpc.sprite.x;
        const dy = this.player.y - liveNpc.sprite.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 44) {
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
          liveNpc.sprite.setVelocity(0, 0);
          liveNpc.sprite.anims.stop();
          if (Math.abs(dx) > Math.abs(dy)) {
            liveNpc.facing = dx > 0 ? 'right' : 'left';
          } else {
            liveNpc.facing = dy > 0 ? 'down' : 'up';
          }
          liveNpc.sprite.setFrame(getIdleFrameForFacing(liveNpc.data.sprite_key, liveNpc.facing));
        }
      } else if (distToPlayer <= 42) {
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
      } else {
        liveNpc.sprite.setVelocity(0, 0);
        liveNpc.sprite.anims.stop();
        liveNpc.sprite.setFrame(getIdleFrameForFacing(liveNpc.data.sprite_key, liveNpc.facing));
      }

      liveNpc.sprite.setDepth(liveNpc.sprite.y);
      liveNpc.badgeContainer.setPosition(liveNpc.sprite.x, liveNpc.sprite.y - 32);
      liveNpc.badgeContainer.setDepth(liveNpc.sprite.y + 10);

      // Keep interaction point synced
      liveNpc.interactionPoint.x = liveNpc.sprite.x;
      liveNpc.interactionPoint.y = liveNpc.sprite.y;
      if (liveNpc.interactionPoint.npcData) {
        liveNpc.interactionPoint.npcData.x = Math.round(liveNpc.sprite.x);
        liveNpc.interactionPoint.npcData.y = Math.round(liveNpc.sprite.y);
      }
    }

    // Check Nearest Interaction Point
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

    if (interactionChanged && nearest && nearest.type !== 'exit_door') {
      sound.playChime();
    }

    // Dropped items pickup in interior
    const now = Date.now();
    for (const [id, liveDrop] of this.droppedItems.entries()) {
      if (now >= liveDrop.data.canPickupAt) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, liveDrop.data.x, liveDrop.data.y);
        if (dist <= 34) {
          const catalogItem = getCatalogItem(liveDrop.data.itemId);
          if (catalogItem) {
            const curInv = loadPlayerInventory();
            const res = addItemToInventory(curInv, catalogItem, liveDrop.data.quantity);
            if (res.success) {
              sound.playInteractClick();
              removeDroppedItem(id);
              liveDrop.tween?.stop();
              liveDrop.container.destroy();
              this.droppedItems.delete(id);

              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('jeeva:item-picked-up', {
                    detail: { item: catalogItem, quantity: liveDrop.data.quantity },
                  })
                );
              }
            }
          }
        }
      }
    }

    if (this.onStateChange) {
      this.onStateChange({
        playerX: Math.round(this.player.x),
        playerY: Math.round(this.player.y),
        currentZone: this.getRoomZoneName(),
        isMoving,
        isSprinting,
        activeInteraction: this.activeInteraction ? { ...this.activeInteraction } : null,
        isInsideInterior: true,
        interiorId: this.buildingId,
        npcs: this.getNpcWorldStates(),
        followingNpcId: this.followingNpcId,
      });
    }
  }
}
