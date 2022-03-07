import { GameObject } from 'UnityEngine';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { Text } from 'UnityEngine.UI';

export default class UIManager extends ZepetoScriptBehaviour {
    /* Singleton */

    private static instance: UIManager;

    // Waiting
    public text_Ready: Text;

    // Playing
    public text_Playing: Text;

    // Result
    public text_Result : Text;
    
    static GetInstance(): UIManager {
        if (!UIManager.instance) {
            const targetObj = GameObject.Find("UIManager");
            if (targetObj) UIManager.instance = targetObj.GetComponent<UIManager>();
        }
        return UIManager.instance;
    }

    SetWaitingUI(active : boolean) {
        this.text_Ready.gameObject.SetActive(active); 
        this.SetPlayingUI(false);
        this.SetResultUI(false);
    }

    SetPlayingUI(active: boolean) {
        this.text_Playing.gameObject.SetActive(active);
        
    }

    SetResultUI(active: boolean) {
        this.text_Result.gameObject.SetActive(active);
    }

    Start() {    
        this.SetWaitingUI(true);
        this.SetPlayingUI(false);
        this.SetResultUI(false);
    }

}