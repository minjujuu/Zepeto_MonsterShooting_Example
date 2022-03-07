import { Sandbox, SandboxOptions, SandboxPlayer } from "ZEPETO.Multiplay";
import { Counter, Player, RoomStatus, Transform, Vector3 } from "ZEPETO.Multiplay.Schema";

// 클라이언트와의 통신을 위한 메시지 타입
interface MonsterSpawnInfo {
    spawnIdx: number,
    monId: string,
    monType: number
}

export default class extends Sandbox {

    /** Monster Type에 대한 정의 */
    MONSTER_TYPE = {
        blue: 0,
        red: 1
    }

    // ------------ Game Flow ----------------
    /**
    현재 게임의 Room 상태에 대한 정의입니다.

    0. INIT - 게임 초기화
    1. WAITING - 대기중인 상태
    2. PLAYING - 게임이 플레이 중인 상태
    3. RESULT - 결과창으로 넘어간 상태
    */
    STATUS = {
        INIT: 0,            // 게임 초기화
        WAITING: 1,         // 대기중인 상태
        PLAYING: 2,         // 게임이 플레이 중인 상태
        RESULT: 3           // 결과창으로 넘어간 상태
    }

    /**
    플레이어별로 현재 게임중인지 대기실인지 등에 대한 정의입니다.

    0. INIT- 초기화 상태
    1. WAITING - 대기실에 있는 경우
    2. PLAYING - 플레이 중인 경우
    3. RESULT - 결과화면에 들어간 경우
     */
    PLAYER_GROUP = {
        INIT: 0,    // 초기화 상태
        WAITING: 1, // 대기실에 있는 경우
        PLAYING: 2, // 플레이 중인 경우
        RESULT: 3   // 결과화면에 들어간 경우
    }
    /** 플레이 시작에 필요한 유저의 수 */
    requireUserCount = 1;
    
    /** 플레이 시간에 대한 정의값 */
    // TODO : 빠른 실행 확인을 위해 10초로 임시 지정
    playTime = 10;
    
    /** 대기실에서 게임 시작에 필요한 대기시간 정의값 */
    waitTime = 3;
    
    /** 결과화면 대기시간에 대한 정의값 */
    // TODO : 빠른 실행 확인을 위해 3초로 임시 지정
    resultTime = 3;
    
    /** 카운터를 위한 관련 변수 */
    readyCounter = 0;

    /** 유저 정보를 저장하기 위한 오브젝트 */
    userInfo: any = {};

    // -----------------------------------------
    /** 몬스터 종류 개수 */
    private MONSTER_KINDS: number = 2;
    /** Spawn Point 개수 */
    private SPAWNPOINT_COUNT: number = 2;

    /** 몬스터에게 부여하는 고유 Id를 위한 변수 */
    private monsterId: number = 0;
    /** 몇 초마다 몬스터를 Spawn 할 것인지 나타내는 값 */
    private spawnDelayTime: number = 5;
    /** onTick에서 누적 시간을 관리하기 위한 변수 */
    private monsterSpawnCounter: number = 0;

    onCreate(options: SandboxOptions) {

        /** ------------ Room Status ------------ */
        // room status 초기화
        var roomStatus: RoomStatus = new RoomStatus();
        roomStatus.status = this.STATUS.INIT;
        // counter 초기화
        var counter = new Counter();
        counter.counter = 0;

        // 룸 상태 초기화
        this.changeRoomStatus(this.STATUS.INIT);
        // state 갱신
        this.state.roomStatus = roomStatus;
        this.state.counter = counter;

        /** ------------ Player 관련 메시지 처리 ------------ */
        // 플레이어의 위치 값을 업데이트
        this.onMessage("onChangedTransform", (client, message) => {
            const player = this.state.players.get(client.sessionId);

            const transform = new Transform();
            transform.position = new Vector3();
            transform.position.x = message.position.x;
            transform.position.y = message.position.y;
            transform.position.z = message.position.z;

            transform.rotation = new Vector3();
            transform.rotation.x = message.rotation.x;
            transform.rotation.y = message.rotation.y;
            transform.rotation.z = message.rotation.z;

            player.transform = transform;
        });
        // 플레이어의 CharacterState를 업데이트
        this.onMessage("onChangedState", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            player.state = message.state;
        });

        /** ------------ Bullet 관련 메시지 처리 ------------ */
        // 총알 생성 메시지를 받으면, 보낸 클라이언트를 제외한 클라이언트에게 전달함
        this.onMessage("onBulletCreated", (client, message) => {
            this.broadcast("onBulletCreated", message, { except: client });
        });

        /** ------------ Monster 관련 메시지 처리 ------------- */
        // 몬스터 Hit 메시지를 받으면, 보낸 클라이언트를 제외한 클라이언트에게 전달함
        this.onMessage("onMonsterHit", (client, message) => {
            this.broadcast("onMonsterHit", message, { except: client });
        });
    }


    onTick(deltaTime: number) {

        // 대기실인 경우
        if (this.state.roomStatus.status == this.STATUS.WAITING) {
            if(this.state.players.size >= this.requireUserCount) {
                this.readyCounter += deltaTime;
                if(this.readyCounter / 1000 > this.waitTime) {
                    // 아래 카운터 스키마는 클라이언트에서 UI에 시간초 출력할 때 사용
                    // 카운터에 카운트 수치를 계산하여 갱신하고 타겟도 게임 시작을 위한 상황임을 알림 (3.. 2.. 1.. READY 형태로 보여주기 위해 waitTime 에 1을 더해서 계산)
                    this.state.counter.counter = Math.floor((this.waitTime + 1) - (this.readyCounter - (this.waitTime * 1000)) / 1000);
                    this.state.counter.target = this.STATUS.PLAYING;
                    // 카운터가 0이 되면 게임을 시작함
                    if (this.state.counter.counter == 0) this.changeRoomStatus(this.STATUS.PLAYING);
                }
            }
        }
        // 플레이 중인 경우
        else if (this.state.roomStatus.status == this.STATUS.PLAYING) {
            // 카운터 동작
            this.readyCounter += deltaTime;

            // 카운터 수치 갱신
            this.state.counter.counter = Math.floor(this.playTime - (this.readyCounter / 1000));

            // 시간이 다 되어 게임이 종료되었다면 결과화면으로 넘어감
            if (this.state.counter.counter == 0) this.changeRoomStatus(this.STATUS.RESULT);

            
            /** spawnDelayTime 마다 몬스터가 생성되도록 함 */
            this.monsterSpawnCounter += deltaTime;

            if (this.monsterSpawnCounter / 1000 > this.spawnDelayTime) {
                this.monsterSpawnCounter = 0;
                // 랜덤의 Spawn point 지정
                var randomIdx = Math.floor(this.getRandom(0, this.SPAWNPOINT_COUNT));
                // 랜덤의 Monster Type 지정
                var randomMonType = Math.floor(this.getRandom(0, this.MONSTER_KINDS));
                // MonsterSpawnInfo 타입의 메시지 생성
                let message = { spawnIdx: randomIdx, monId: this.monsterId.toString(), monType: randomMonType } as MonsterSpawnInfo;
                /** 클라이언트에 몬스터 생성 메시지 전달 */
                this.broadcast("MonsterCreated", message);
                // 다음 몬스터는 다른 Id를 부여받을 수 있도록 값을 1 더해줌
                this.monsterId++;
                // 로그 출력
                console.log(`id : ${this.monsterId}, spawnIdx : ${randomIdx}, monType : ${randomMonType}`);
            }
        }
        // 결과화면인 경우
        else if (this.state.roomStatus.status == this.STATUS.RESULT) {

            // 카운터 동작
            this.readyCounter += deltaTime;

            // 카운터 수치 갱신
            this.state.counter.counter = Math.floor(this.resultTime - (this.readyCounter / 1000));

            // 카운터가 0이 되면 대기실로 전환
            if (this.state.counter.counter <= 0) this.changeRoomStatus(this.STATUS.WAITING);
        }
        
    }

    changeRoomStatus(state:number) {
        console.log(`changeRoomStatus - state ${state}-------------`);
        // 현재 roomStatus 확인
        let roomStatus = this.state.roomStatus;
        // 카운터 초기화
        this.readyCounter = 0;

        // 플레이 상황으로 변경하는 경우
        if(state == this.STATUS.PLAYING) {
            // 카운터 갱신
            this.state.counter.counter = this.playTime;
            console.log(`counter를 ${this.playTime}으로 변경`);

            // TODO : 타겟은 클라이언트 UI 변경에 필요한데 우리는 우선 제외
            // 타겟은 Result 로 넘어가야 하기 때문에 RESULT 로 수정
            // this.state.counter.target = this.STATUS.RESULT;

            // 모든 플레이어의 group을 변경해야 함 
            this.state.players.forEach((player:Player, sessionId:string) => {
                this.state.players.get(sessionId).group = this.PLAYER_GROUP.PLAYING;
                console.log(`changeRoomStatus - ${sessionId}의 group을 변경 => ${this.state.players.get(sessionId).group}`);
            });
        }
        // 결과 화면으로 변경하는 경우
        else if(state == this.STATUS.RESULT) {
            // 카운터 갱신
            this.state.counter.counter = this.resultTime;
            // 모든 플레이어의 group을 변경해야 함 
            this.state.players.forEach((player:Player, sessionId:string) => {
                // 결과 화면으로 변경되는경우 게임에 참가 하고 있던 플레이어들만 결과 화면으로 변경
                if(this.state.players.get(sessionId).group == this.PLAYER_GROUP.PLAYING) {
                    this.state.players.get(sessionId).group = this.PLAYER_GROUP.RESULT;
                }
                console.log(`changeRoomStatus - ${sessionId}의 group을 변경 => ${this.state.players.get(sessionId).group}`);
            });
        }
        // 대기실로 넘어가는 경우
        else if(state == this.STATUS.WAITING) {
            // 카운터 갱신
            this.state.counter.counter = 0;

            this.state.players.forEach((player:Player, sessionId:string) => {
                // 결과 화면으로 변경되는경우 게임에 참가 하고 있던 플레이어들만 결과 화면으로 변경
                if(this.state.players.get(sessionId).group == this.PLAYER_GROUP.PLAYING) {
                    this.state.players.get(sessionId).group = this.PLAYER_GROUP.RESULT;
                }
                console.log(`changeRoomStatus - ${sessionId}의 group을 변경 => ${this.state.players.get(sessionId).group}`);
            });
        }
        // 현재 room status를 변경
        roomStatus.status = state;
    }

    /** 유저가 방에 Join 되었을 때 호출됨 */
    async onJoin(client: SandboxPlayer) {
        console.log(`[onJoin] client.sessionId = ${client.sessionId}, cur room statue = ${this.state.roomStatus.status}`);
        const player = new Player();
        player.sessionId = client.sessionId;
        player.zepetoHash = client.hashCode;
        player.zepetoUserId = client.userId;
        // player.score = 0;
        player.group = this.PLAYER_GROUP.INIT;
        // players에 player 추가 
        this.state.players.set(client.sessionId, player);

        // 방이 처음 생성되었을 경우에는 대기실로 전환
        if (this.state.roomStatus.status == this.STATUS.INIT) this.changeRoomStatus(this.STATUS.WAITING);
        // 인원수가 맞으면 게임을 시작
        else if (this.state.roomStatus.status == this.STATUS.WAITING) {
            // 대기실이면 새로운 사람이 들어 왔을때 시작 카운트 다운을 초기화 해야함.
            this.readyCounter = 0;
        }
    }

    async onLeave(client: SandboxPlayer, consented?: boolean) {
        this.state.players.delete(client.sessionId);
    }

    /** 랜덤수치 획득용 함수 */
    getRandom(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

}
