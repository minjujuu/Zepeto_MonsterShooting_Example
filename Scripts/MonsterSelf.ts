import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import * as UnityEngine from 'UnityEngine';
import { Room } from 'ZEPETO.Multiplay';
import SpawnManager from './SpawnManager';
import { Vector3 } from 'ZEPETO.Multiplay.Schema';

export default class MonsterSelf extends ZepetoScriptBehaviour {

    /** Multiplay */
    private spawnManager: SpawnManager;
    private room: Room;
    
    @SerializeField()
    private selfId: string = "";
    public hp: number;
    public moveSpeed: number;
    private targetPlayerID: string = "";
    public distance: number;

    private curHp: number = 0;

    private monsterAnim: UnityEngine.Animator;

    public material_default : UnityEngine.Material;
    public material_hit : UnityEngine.Material;

    Start() {
        this.spawnManager = UnityEngine.GameObject.FindObjectOfType<SpawnManager>();
        this.room = this.spawnManager.GetRoomInfo();
        this.curHp = this.hp;

        this.monsterAnim = this.GetComponent<UnityEngine.Animator>();
    }

    public SetMonsterId(id: string) {
        this.selfId = id;
        // console.log(`monster selfId is assigned : ${this.selfId}`);
    }

    public SetTargetPlayerId(id: string) {
        this.targetPlayerID = id;
        // console.log(`monster targetPlayer is assigned : ${this.targetPlayerID}`);
    }

    Update() {

        if (this.targetPlayerID != "") {
            // 타겟 플레이어의 포지션을 서버의 room state로부터 검색
            var playerPos = this.ParseVector3(this.room.State.players.get_Item(this.targetPlayerID).transform.position);
            // 타겟 플레이어와의 거리가 일정 값 이상일 때만 해당 플레이어를 향해 이동
            if (UnityEngine.Vector3.Distance(playerPos, this.transform.position) > this.distance) {
                // 타겟 플레이어 위치로의 방향을 구함
                var dir = new UnityEngine.Vector3(playerPos.x - this.transform.position.x, playerPos.y - this.transform.position.y, playerPos.z - this.transform.position.z);
                dir = dir.normalized;
                // 몬스터의 이동 속도 조절
                dir = new UnityEngine.Vector3(dir.x * this.moveSpeed, dir.y * this.moveSpeed, dir.z * this.moveSpeed);
                // 이동
                // this.transform.Translate(dir);
                // 타겟 플레이어를 바라보게 함
                this.transform.LookAt(playerPos);
                // forward 방향으로 이동하게 함 
                this.transform.Translate(new UnityEngine.Vector3(0, 0, this.moveSpeed));
                this.monsterAnim.SetBool("IsAttack", false);
            }
            else {
                this.monsterAnim.SetBool("IsAttack", true);
                this.monsterAnim.SetTrigger("Trig_KeepAttack");
            }
        }
    }

    OnCollisionEnter(coll: UnityEngine.Collision) {
        // 총알에 부딪힌 경우        
        if (coll.gameObject.tag == "Bullet") {
            // Hp 차감
            this.AddMonsterHp(-1);
            // spawnManager를 통해 서버로 메시지 전송
            this.spawnManager.onMonsterHit(this.selfId, this.curHp);
            if(this.curHp > 0)
                this.monsterAnim.SetTrigger("Trig_Hit");
            else {
                this.monsterAnim.SetBool("IsDie", true);
            }
        }
    }

    // 서버로부터 "onMonsterHit" 메시지를 받은 경우에도 호출됨
    public AddMonsterHp(val: number) {
        this.curHp += val;
    }

    private ParseVector3(vector3: Vector3): UnityEngine.Vector3 {
        return new UnityEngine.Vector3(
            vector3.x,
            vector3.y,
            vector3.z
        );
    }
}