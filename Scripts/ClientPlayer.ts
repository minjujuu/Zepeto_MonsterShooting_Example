import { GameObject, Object } from 'UnityEngine';
import { CharacterState, SpawnInfo, ZepetoPlayer, ZepetoPlayerControl, ZepetoPlayers } from 'ZEPETO.Character.Controller'
import { Room, RoomData } from 'ZEPETO.Multiplay';
import { Player, State, Transform, Vector3 } from 'ZEPETO.Multiplay.Schema';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';
import * as UnityEngine from 'UnityEngine'
import { Button, Image } from 'UnityEngine.UI';
import PlayerController from './PlayerController';
import UIManager from './UIManager';
export default class ClientPlayer extends ZepetoScriptBehaviour {


    /** Multiplay */
    public multiplay: ZepetoWorldMultiplay;
    private room: Room;

    public firePos: UnityEngine.Transform;
    // public playerUIs : GameObject[];
    // public playerUIidx : number = 1;
    public bulletPrefab: GameObject;
    private zepetoPlayer: ZepetoPlayer;
    private currentPlayers: Map<string, Player> = new Map<string, Player>();

    // public playerScoreUIs: Map<string, GameObject> = new Map<string, GameObject>();
    public btn_Shoot: Button;

    // ------------ Game Flow ----------------
    /** 현재 게임의 Room 상태에 대한 정의입니다. */
    STATUS = {
        INIT: 0,            // 게임 초기화
        WAITING: 1,         // 대기중인 상태
        PLAYING: 2,         // 게임이 플레이 중인 상태
        RESULT: 3           // 결과창으로 넘어간 상태
    }
    
    private gameStatus = this.STATUS.INIT;

    Start() {
        this.multiplay.RoomCreated += (room: Room) => {
            this.room = room;
        };

        this.StartCoroutine(this.SendMessageLoop(0.1));

        // 총알 발사 버튼 [Shoot] 클릭
        this.btn_Shoot.onClick.AddListener(() => {
            const data = new RoomData();

            const pos = new RoomData();
            pos.Add("x", this.firePos.position.x);
            pos.Add("y", this.firePos.position.y);
            pos.Add("z", this.firePos.position.z);
            data.Add("position", pos.GetObject());
    
            const rot = new RoomData();
            rot.Add("x", this.firePos.eulerAngles.x);
            rot.Add("y", this.firePos.eulerAngles.y);
            rot.Add("z", this.firePos.eulerAngles.z);
            data.Add("rotation", rot.GetObject());

            // 서버로 총알 생성 메시지 전달 
            this.room.Send("onBulletCreated",data.GetObject());
            // 로컬 플레이어의 총알 생성
            Object.Instantiate<GameObject>(this.bulletPrefab, this.firePos.position, this.firePos.rotation);
        });

        this.multiplay.RoomJoined += (room: Room) => {
            room.OnStateChange += this.OnStateChange;

            this.room.AddMessageHandler("onBulletCreated", (message:any) => {
                let pos = new UnityEngine.Vector3(message.position.x, message.position.y , message.position.z);
                let rot = UnityEngine.Quaternion.Euler(message.rotation.x, message.rotation.y ,message.rotation.z);
                // 다른 플레이어의 총알 생성
                Object.Instantiate<GameObject>(this.bulletPrefab, pos , rot);

                // 입장했는데, 현재 게임 상태가 waiting이 아닌 경우 waiting으로 변경
                if(this.gameStatus != this.STATUS.WAITING) {
                    this.gameStatus = this.STATUS.WAITING;
                    
                }
            });

        }
    }


    private* SendMessageLoop(tick: number) {
        while (true) {
            yield new UnityEngine.WaitForSeconds(tick);

            if (this.room != null && this.room.IsConnected) {
                const hasPlayer = ZepetoPlayers.instance.HasPlayer(this.room.SessionId);
                if (hasPlayer) {
                    const myPlayer = ZepetoPlayers.instance.GetPlayer(this.room.SessionId);
                    if (myPlayer.character.CurrentState != CharacterState.Idle)
                        this.SendTransform(myPlayer.character.transform);
                }
            }
        }
    }

    OnStateChange(state: State, isFirst: boolean) {

        if (isFirst) {
            ZepetoPlayers.instance.OnAddedLocalPlayer.AddListener(() => {

                const myPlayer = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer;
                this.zepetoPlayer = myPlayer;
                this.zepetoPlayer.character.gameObject.tag = "Player";
                this.zepetoPlayer.character.gameObject.AddComponent<PlayerController>();
                // 총알 발사 위치 설정
                this.firePos.transform.parent = this.zepetoPlayer.character.transform;
                this.firePos.transform.localPosition = new UnityEngine.Vector3(0.13, 0.8, 0.06);
                
                myPlayer.character.OnChangedState.AddListener((cur, next) => {
                    this.SendState(next);
                });
            });

            ZepetoPlayers.instance.OnAddedPlayer.AddListener((sessionId: string) => {
                const isLocal = this.room.SessionId === sessionId;
                if (!isLocal) {
                    const player: Player = this.currentPlayers.get(sessionId);

                    player.OnChange += (changeValues) => this.OnUpdatePlayer(sessionId, player);
                }
            });

            // --------------------- Game Flow ---------------------
            const roomStatus = state.roomStatus;
            const counter = state.counter;
            console.log(`roomStatus.status - ${roomStatus.status}`);
            if(roomStatus.status == this.STATUS.WAITING) {
                UIManager.GetInstance().SetWaitingUI(true);
            }
            else if(roomStatus.status == this.STATUS.PLAYING) {
                UIManager.GetInstance().SetPlayingUI(true);
            }
            else if(roomStatus.status == this.STATUS.RESULT) {
                UIManager.GetInstance().SetResultUI(true);
            }

        }
        let join = new Map<string, Player>();
        let leave = new Map<string, Player>(this.currentPlayers);

        state.players.ForEach((sessionId: string, player: Player) => {
            if (!this.currentPlayers.has(sessionId)) {
                join.set(sessionId, player);
            }
            leave.delete(sessionId);
        });

        join.forEach((player: Player, sessionId: string) => this.OnJoinPlayer(sessionId, player));
        leave.forEach((player: Player, sessionId: string) => this.OnLeavePlayer(sessionId, player));
    }
    
    OnJoinPlayer(sessionId: string, player: Player): void {

        this.currentPlayers.set(sessionId, player);
        
        const isLocal = this.room.SessionId === player.sessionId;
        ZepetoPlayers.instance.CreatePlayerWithUserId(sessionId, player.zepetoUserId, new SpawnInfo, isLocal);
        // this.playerScoreUIs.set(sessionId, this.playerUIs[1]);
    }

    OnUpdatePlayer(sessionId: string, player: Player) {
        
        const position = this.ParseVector3(player.transform.position);
        
        const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);
        zepetoPlayer.character.MoveToPosition(position);
        
        if (player.state === CharacterState.JumpIdle || player.state === CharacterState.JumpMove) {
            zepetoPlayer.character.Jump();
        }
        // score bar
        // const scoreUI = this.playerUIs[1];
        // scoreUI.gameObject.GetComponent<Image>().fillAmount = player.score;
    }

    OnLeavePlayer(sessionId: string, player: Player): void {
        this.currentPlayers.delete(sessionId);

        ZepetoPlayers.instance.RemovePlayer(sessionId);
    }

    SendTransform(transform: UnityEngine.Transform) {
        const data = new RoomData();

        const pos = new RoomData();
        pos.Add("x", transform.localPosition.x);
        pos.Add("y", transform.localPosition.y);
        pos.Add("z", transform.localPosition.z);
        data.Add("position", pos.GetObject());

        const rot = new RoomData();
        rot.Add("x", transform.localEulerAngles.x);
        rot.Add("y", transform.localEulerAngles.y);
        rot.Add("z", transform.localEulerAngles.z);
        data.Add("rotation", rot.GetObject());

        this.room.Send("onChangedTransform", data.GetObject());
    }

    SendState(state: CharacterState) {
        const data = new RoomData();
        data.Add("state", state);
        this.room.Send("onChangedState", data.GetObject());
    }

    private ParseVector3(vector3: Vector3): UnityEngine.Vector3 {
        return new UnityEngine.Vector3(
            vector3.x,
            vector3.y,
            vector3.z
        );
    }
    
    // SpawnManager에서 스폰할 몬스터와 가장 가까운 플레이어를 검색하기 위해 호출
    public SearchNearestPlayer(spawnPoint : UnityEngine.Transform) : string {
        // 초기값 설정을 위한 변수
        var isFirst = true;
        // 리턴 값인 플레이어의 sessionId를 담을 변수
        var nearestPlayerId = null;
        // 최소 거리
        var minDistance = 0;
        // 현재 room에 있는 플레이어를 조회하면서 거리를 계산
        this.currentPlayers.forEach((player: Player, sessionId: string) => {
            // 거리의 초기값 설정
            if(isFirst) {
                minDistance = UnityEngine.Vector3.Distance(spawnPoint.position, this.ParseVector3(player.transform.position));
                nearestPlayerId = sessionId;
                isFirst = false;
            }
            // 더 적은 거리의 플레이어가 있을 경우 최소 거리 갱신
            var distance = UnityEngine.Vector3.Distance(spawnPoint.position, this.ParseVector3(player.transform.position));
            if(distance < minDistance) {
                minDistance = distance;
                nearestPlayerId = sessionId;
            }
        });

        return nearestPlayerId;
    }

    // public OnPlayerGetScore() {
    //     this.room.Send("onPlayerGetScore");
    //     // local player의 UI는 로컬에서 업데이트
    //     this.playerUIs[0].gameObject.GetComponent<Image>().fillAmount += 0.05;
    // }

    
}