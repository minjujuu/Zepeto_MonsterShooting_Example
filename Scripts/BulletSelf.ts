import { GameObject, RequireComponent, Rigidbody, Vector3, WaitForSeconds } from 'UnityEngine'
import { Room, RoomData } from 'ZEPETO.Multiplay';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';
import ClientPlayer from './ClientPlayer';


export default class BulletSelf extends ZepetoScriptBehaviour {

    private rigidbody : Rigidbody;
    public bulletSpeed: number;

    public selfId:number;

    Start() {    
    
        // 발사
        this.rigidbody = this.GetComponent<Rigidbody>();
        this.rigidbody.velocity = this.transform.forward;
        this.rigidbody.velocity = new Vector3(this.rigidbody.velocity.x * this.bulletSpeed, this.rigidbody.velocity.y * this.bulletSpeed, this.rigidbody.velocity.z * this.bulletSpeed);

        this.StartCoroutine(this.DestroySelf());
    
    }

    *DestroySelf() {
        yield new WaitForSeconds(3);
        GameObject.Destroy(this.gameObject);
    }

}