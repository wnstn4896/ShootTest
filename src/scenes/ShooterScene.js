export class ShooterScene extends Phaser.Scene {
    constructor() {
        super('ShooterScene');
        this.playerHP = 100; // 플레이어 체력
        this.enemyHP = 800;  // 적 체력
    }

    create() {
        // 배경 설정
        this.background = this.add.tileSprite(640, 360, 1280, 720, 'digitalBackground'); // 월드 크기와 동일하게 설정
        this.physics.world.setBounds(0, 0, 1280, 720); // 월드 경계 설정

         // 플레이어 생성
        this.player = this.physics.add.sprite(200, 300, 'openion2_32bit');
        this.player.setCollideWorldBounds(true);
        this.player.setScale(0.09);

        // 피탄 판정 히트박스 생성
        this.playerHitbox = this.add.circle(this.player.x, this.player.y, 5, 0xffffff); // 반경 5px
        this.physics.add.existing(this.playerHitbox, false); // 물리 엔진에 추가 (false = 정적)

        // 히트박스 테두리 생성
        this.playerHitboxBorder = this.add.graphics();
        this.playerHitboxBorder.lineStyle(2, 0xffffff); // 테두리 두께 2, 흰색
        this.playerHitboxBorder.strokeCircle(this.player.x, this.player.y, 5); // 반경 5px

        // 히트박스와 테두리 동기화
        this.physics.world.on('worldstep', () => {
            this.playerHitboxBorder.clear();
            this.playerHitboxBorder.lineStyle(2, 0xff0000);
            this.playerHitboxBorder.strokeCircle(this.playerHitbox.x, this.playerHitbox.y, 5);
        });

        // 입력 키 설정
        this.cursors = this.input.keyboard.createCursorKeys();

        // 환경 감지: PC인지 모바일인지 확인
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            // **가상 조이스틱 생성**
            this.joystickBase = this.add.circle(100, 600, 50, 0x808080, 0.5);
            this.joystickHandle = this.add.circle(100, 600, 30, 0xffffff, 0.8);
            this.input.on('pointerdown', this.startJoystick, this);
            this.input.on('pointermove', this.moveJoystick, this);
            this.input.on('pointerup', this.stopJoystick, this);

            // **발사 버튼 생성**
            this.fireButton = this.add.circle(1180, 600, 80, 0xff0000, 0.8).setInteractive(); // 터치 영역 확대
            this.fireButtonText = this.add.text(1180, 600, '발사', {
                font: '20px Arial',
                fill: '#ffffff',
            })
            .setOrigin(0.5); // 텍스트를 버튼의 정 중앙에 배치

            // 발사 버튼 이벤트 처리
            this.fireButton.on('pointerdown', () => {
                this.spaceKeyDown = true;
            });
            this.fireButton.on('pointerup', () => {
                this.spaceKeyDown = false;
            });
        }

        // 플레이어 체력 바
        this.playerHPBar = this.add.graphics();
        this.updatePlayerHPBar(); // 체력 바 초기화

        // 적 체력 바
        this.enemyHPBar = this.add.graphics();
        this.updateEnemyHPBar(); // 체력 바 초기화

        // 탄막 그룹 설정
        this.playerBullets = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();

        // 스페이스바 눌림 상태 이벤트 설정
        this.input.keyboard.on('keydown-SPACE', () => {
            this.spaceKeyDown = true;
        });

        this.input.keyboard.on('keyup-SPACE', () => {
            this.spaceKeyDown = false;
        });

        // 탄막 연사 이벤트
        this.time.addEvent({
            delay: 90,
            callback: this.shootPlayerBullet,
            callbackScope: this,
            loop: true,
        });

        // 적 생성
        this.enemies = this.physics.add.group({
            key: 'clonihil2_32bit',
            repeat: 0, // 적 1개만 생성
            setXY: { x: 700, y: 300 },
        });

        this.enemies.children.iterate((enemy) => {
            enemy.setScale(0.12);
            enemy.setCollideWorldBounds(true); // 월드 경계 밖으로 못 나가게 설정
            enemy.setBounce(1); // 충돌 시 반전
            enemy.setVelocityY(50); // 초기 속도 설정
            enemy.setVelocityX(-50);
        });

        // 적 텔레포트 및 무작위 탄막 발사
        this.time.addEvent({
            delay: 550, // 텔레포트 주기
            callback: this.teleportEnemy,
            callbackScope: this,
            loop: true,
        });

        // 충돌 처리
        this.physics.add.overlap(this.playerBullets, this.enemies, this.handleBulletHit, null, this);
        this.physics.add.overlap(this.enemyBullets, this.playerHitbox, this.handlePlayerHit, null, this);
    }

    startJoystick(pointer) {
        if (Phaser.Math.Distance.Between(pointer.x, pointer.y, this.joystickBase.x, this.joystickBase.y) < 50) {
            this.joystickActive = true;
        }
    }
    
    moveJoystick(pointer) {
        if (this.joystickActive) {
            const angle = Phaser.Math.Angle.Between(
                this.joystickBase.x,
                this.joystickBase.y,
                pointer.x,
                pointer.y
            );
    
            const distance = Phaser.Math.Clamp(
                Phaser.Math.Distance.Between(
                    this.joystickBase.x,
                    this.joystickBase.y,
                    pointer.x,
                    pointer.y
                ),
                0,
                50
            );
    
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
    
            this.joystickHandle.setPosition(this.joystickBase.x + dx, this.joystickBase.y + dy);
    
            // 플레이어 이동
            this.player.setVelocity(dx * 11, dy * 11);
        }
    }
    
    stopJoystick() {
        this.joystickActive = false;
        this.joystickHandle.setPosition(this.joystickBase.x, this.joystickBase.y);
        this.player.setVelocity(0, 0);
    }

    updatePlayerHPBar() {
        this.playerHPBar.clear();
        this.playerHPBar.fillStyle(0x00ff00, 1); // 초록색
        this.playerHPBar.fillRect(20, 660, (this.playerHP / 100) * 100, 20); // 플레이어 체력 바 위치
        // 조작키 설명 텍스트
        this.controlsText = this.add.text(200, 660, '↑↓←→: 이동 | 스페이스바: 탄막 발사', {
            fontSize: '16px',
            fill: '#ffffff',
            padding: { top: 2, bottom: 2 }, // 상단과 하단에 2px 여백 추가
        });
    }
    
    updateEnemyHPBar() {
        this.enemyHPBar.clear();
        this.enemyHPBar.fillStyle(0xff0000, 1); // 빨간색
        this.enemyHPBar.fillRect(20, 20, (this.enemyHP / 800) * 700, 20); // 적 체력 바 위치
    }
    

    teleportEnemy() {
        this.enemies.children.iterate((enemy) => {
            // 화면 내 무작위 위치로 텔레포트
            enemy.setPosition(
                Phaser.Math.Between(450, 1100), // 무작위 X
                Phaser.Math.Between(55, 680)   // 무작위 Y
            );

            if (enemy.active) {
                // 체력 조건에 따른 패턴 분기
                if (this.enemyHP <= 300) {
                    // 3차 패턴: 밀집 탄막
                    for (let angle = -45; angle <= 45; angle += 10) {
                        const bullet = this.enemyBullets.create(enemy.x - 20, enemy.y, 'clonihil2_bullet');
                        const velocity = new Phaser.Math.Vector2(-375, 0).rotate(Phaser.Math.DegToRad(angle));
                        bullet.setVelocity(velocity.x, velocity.y);
                        bullet.setScale(1.5); // 탄막 크기 조정
                    }
                } else if (this.enemyHP <= 700) {
                    // 2차 패턴: 360도 탄막
                    for (let i = 0; i < 360; i += 45) {
                        const bullet = this.enemyBullets.create(enemy.x - 20, enemy.y, 'clonihil2_bullet');
                        const velocity = new Phaser.Math.Vector2(500, 300).rotate(Phaser.Math.DegToRad(i));
                        bullet.setVelocity(velocity.x, velocity.y);
                        bullet.setScale(7); // 탄막 크기 증가
                    }
                } else {
                    // 기본 패턴: 스프레드 탄막
                    for (let angle = -30; angle <= 30; angle += 15) {
                        const bullet = this.enemyBullets.create(enemy.x - 20, enemy.y, 'clonihil2_bullet');
                        const velocity = new Phaser.Math.Vector2(-500, 50).rotate(Phaser.Math.DegToRad(angle));
                        bullet.setVelocity(velocity.x, velocity.y);
                        bullet.setScale(1.5);
                    }
                }
            }
        });
    }

    shootPlayerBullet() {
        if (this.spaceKeyDown) {
            // 직선 탄막
            const straightBullet = this.playerBullets.create(this.player.x + 20, this.player.y, 'bullet');
            straightBullet.setVelocityX(1000);
            straightBullet.setScale(1.5);

            // 직선(후방) 탄막
            const backBullet = this.playerBullets.create(this.player.x + 20, this.player.y, 'bullet');
            backBullet.setVelocityX(-1000);
            backBullet.setScale(2.0);

    
            // 위쪽 대각선 탄막
            const upDiagonalBullet = this.playerBullets.create(this.player.x + 20, this.player.y - 5, 'bullet'); // 약간 위쪽에서 발사
            upDiagonalBullet.setVelocity(1000, 350);
    
            // 아래쪽 대각선 탄막
            const downDiagonalBullet = this.playerBullets.create(this.player.x + 20, this.player.y + 5, 'bullet'); // 약간 아래쪽에서 발사
            downDiagonalBullet.setVelocity(1000, -350);
        }
    }

    handleBulletHit(bullet, enemy) {
        // 적 체력 감소
        this.enemyHP -= 1;
        this.updateEnemyHPBar();

        if (this.enemyHP <= 0) {
            if (this.playerHP === 10)
                this.playerHP = 120; // 게임 오버 연출 중복 실행 방지
            enemy.destroy();
            this.cameras.main.flash(1000, 0, 0, 0);
            setTimeout(() => {
                this.scene.start('MidPartScene');
            }, 500);
        }
    }

    handlePlayerHit(player, bullet) {
        bullet.destroy();
    
        // **1초 동안 화면이 빨갛게 번쩍임 (플레이어 피격 연출)**
        this.cameras.main.flash(1000, 255, 0, 0);
    
        // 플레이어 체력 감소
        this.playerHP -= 10;
        this.updatePlayerHPBar();
    
        if (this.playerHP <= 0) {
            // **게임 오버 연출 시작**
            this.gameOverSequence();
        }
    }
    
    gameOverSequence() {
        // **모든 게임 요소 제거 및 충돌 처리 중지**
        this.physics.pause();  // 물리 엔진 정지
        this.player.setVisible(false);  // 플레이어 숨기기
        this.playerHitbox.setVisible(false); // 플레이어 피탄 판정 숨기기
        this.enemies.clear(true, true); // 적 제거
        this.playerBullets.clear(true, true); // 플레이어 탄막 제거
        this.enemyBullets.clear(true, true); // 적 탄막 제거
    
        // **배경 변경: 게임 오버 화면으로 설정**
        this.background.setTexture('gameover');
    
        // **배경 위치 초기화
        this.background.tilePositionX = 0;

        // **배경 스크롤 정지**
        this.gameOver = true; 
    
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } 

    update() {
        if (!this.gameOver) {
            // 배경 스크롤 (게임 진행 중일 때만)
            this.background.tilePositionX += 5;
        }
    
        // 플레이어 이동 제한 및 속도 개선
        if (this.cursors.left.isDown) this.player.x = Math.max(this.player.x - 5, 0); // 왼쪽 경계 제한
        else if (this.cursors.right.isDown) this.player.x = Math.min(this.player.x + 5, 1260); // 오른쪽 경계 제한
    
        if (this.cursors.up.isDown) this.player.y = Math.max(this.player.y - 5, 0); // 상단 경계 제한
        else if (this.cursors.down.isDown) this.player.y = Math.min(this.player.y + 5, 690); // 하단 경계 제한

        // 히트박스 위치 동기화
        this.playerHitbox.setPosition(this.player.x, this.player.y);
    
        // 적 경계 이탈 방지
        this.enemies.children.iterate((enemy) => {
            if (enemy.x <= 0 || enemy.x >= 1260) enemy.setVelocityX(-enemy.body.velocity.x);
            if (enemy.y <= 0 || enemy.y >= 690) enemy.setVelocityY(-enemy.body.velocity.y);
        });
    }
}