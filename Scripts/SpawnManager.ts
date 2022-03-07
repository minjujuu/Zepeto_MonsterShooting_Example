import { GameObject, Transform, WaitForSeconds } from 'UnityEngine'
import { Room } from 'ZEPETO.Multiplay';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';
import MonsterSelf from './MonsterSelf';
import ClientPlayer from './ClientPlayer';
import LeaderBoardManager from './LeaderBoardManager';

// 서버와의 통신을 위한 메시지 타입
interface MonsterSpawnInfo {
    spawnIdx: number,
    monId: string
    monType: number
}

export default class SpawnManager extends ZepetoScriptBehaviour {
    
    private leaderboardManager : LeaderBoardManager;
    /** Monster Type에 대한 정의 */
    MONSTER_TYPE = {
        red: 0,
        blue: 1
    }
    /** Multiplay */
    public multiplay: ZepetoWorldMultiplay;
    private room: Room;

    /** Monster */
    public monsterPrefab_red: GameObject;
    public monsterPrefab_blue: GameObject;
    public spawnPoints: Transform[];

    private activeMonsterObjects: Map<string, GameObject> = new Map<string, GameObject>();
    private clientPlayer: ClientPlayer;

    Start() {
        this.clientPlayer = GameObject.FindObjectOfType<ClientPlayer>();
        this.leaderboardManager = GameObject.FindObjectOfType<LeaderBoardManager>();

        this.multiplay.RoomCreated += (room: Room) => {
            this.room = room;
        };
        this.multiplay.RoomJoined += (room: Room) => {

            /** ------------ Monster 관련 메시지 처리 ------------- */
            this.room.AddMessageHandler("MonsterCreated", (message: MonsterSpawnInfo) => {
                // 서버에서 설정한 랜덤의 spawn point index
                var spawnIdx = message.spawnIdx;
                // 서버에서 설정한 몬스터의 고유 Id
                var monId = message.monId;
                // 서버에서 설정한 랜덤의 monster type
                var monType = message.monType;
                // 몬스터 타입에 따라 프리팹 설정
                var monPrefab = null;
                if (monType == this.MONSTER_TYPE.red) {
                    monPrefab = this.monsterPrefab_red;
                }
                else {
                    monPrefab = this.monsterPrefab_blue;
                }
                // 로그 출력
                // console.log(`[MonsterCreated] spawnIdx = ${spawnIdx}, monId = ${monId}, monType = ${monType}`);
                // 몬스터 생성
                var obj = GameObject.Instantiate<GameObject>(monPrefab, this.spawnPoints[spawnIdx].position, this.spawnPoints[spawnIdx].rotation);
                // 몬스터의 Id 설정
                obj.GetComponent<MonsterSelf>().SetMonsterId(monId);
                // 몬스터가 Spawn 되는 지점에서 가장 가까운 플레이어를 검색하여 타겟으로 설정해줌
                obj.GetComponent<MonsterSelf>().SetTargetPlayerId(this.clientPlayer.SearchNearestPlayer(this.spawnPoints[spawnIdx]));
                // 활성 몬스터 Map에 등록
                this.activeMonsterObjects.set(monId, obj);
            });

            // 몬스터 "Hit" 메시지를 받은 경우
            this.room.AddMessageHandler("onMonsterHit", (message: string) => {
                var hitMonId = message;
                if (this.activeMonsterObjects.has(hitMonId)) {
                    // 다른 플레이어가 쏜 몬스터의 hp를 차감 
                    var obj = this.activeMonsterObjects.get(hitMonId);
                    obj.GetComponent<MonsterSelf>().AddMonsterHp(-1);
                }
            });
        }
    }

    // MonsterSelf.ts에서 총알에 맞은 경우 호출함
    public onMonsterHit(id: string, hp: number) {
        // 몬스터의 Hp가 아직 남은 경우
        if (hp > 0) {
            // 서버로 "Hit" 메시지 전달
            this.room.Send("onMonsterHit", id);
        }
        else {
            // 몬스터의 Hp가 0이 된 경우
            if (this.activeMonsterObjects.has(id)) {
                this.StartCoroutine(this.DestroyDelay(id));
                this.leaderboardManager.AddLeaderBoardScore();
            }
        }
    }

    *DestroyDelay(id:string) {
        yield new WaitForSeconds(0);
        GameObject.Destroy(this.activeMonsterObjects.get(id));
    }

    // MonsterSelf.ts에서 멀티 룸 정보를 얻기 위해 호출함
    public GetRoomInfo(): Room {
        return this.room;
    }
}