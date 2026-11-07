import Phaser from 'phaser';
import { InteriorType, InteractionPoint, GameStateEvent } from './types';
import { sound } from './audio';

export interface InteriorSceneInitData {
  buildingId: InteriorType;
  returnPos: { x: number; y: number };
  onStateChange?: (event: GameStateEvent) => void;
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
  private lastFacing: 'down' | 'left' | 'right' | 'up' = 'up';
  private interactionPoints: InteractionPoint[] = [];
  private activeInteraction: InteractionPoint | null = null;
  private isExiting = false;

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
    this.isExiting = false;
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

    this.physics.add.collider(this.player, this.obstacleGroup);

    // Setup Camera
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, this.roomWidth, this.roomHeight);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.roundPixels = true;

    // Inputs
    this.setupInputs();

    this.scale.on('resize', this.handleResize, this);
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
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      sprint: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      interact: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };

    this.input.keyboard.on('keydown-E', () => {
      this.triggerActiveInteraction();
    });
    this.input.keyboard.on('keydown-SPACE', () => {
      this.triggerActiveInteraction();
    });
    this.input.keyboard.on('keydown-Z', () => {
      this.cycleZoom();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-E');
      this.input.keyboard?.off('keydown-SPACE');
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

    sound.playFootstep();
    this.cameras.main.fadeOut(200, 15, 23, 18);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('VillageScene', {
        returnPos: this.returnPos,
        onStateChange: this.onStateChange,
      });
    });
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
      });
    }
  }
}
