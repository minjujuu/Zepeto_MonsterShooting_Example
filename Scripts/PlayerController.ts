import { Collider, GameObject } from 'UnityEngine';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import ClientPlayer from './ClientPlayer';
import LeaderBoardManager from './LeaderBoardManager';

export default class PlayerController extends ZepetoScriptBehaviour {

    private leaderboardManager : LeaderBoardManager;
    private clientPlayer : ClientPlayer;
    Start() {    
        this.leaderboardManager = GameObject.FindObjectOfType<LeaderBoardManager>();
        this.clientPlayer = GameObject.FindObjectOfType<ClientPlayer>();
    }

    OnTriggerEnter(col: Collider) {
        if(col.gameObject.tag == "Monster_weapon") {
            this.leaderboardManager.SubPlayerHP();
        }
    }

}