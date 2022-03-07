import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { GetAllLeaderboardsResponse, GetRangeRankResponse, LeaderboardAPI, ResetRule, SetScoreResponse } from 'ZEPETO.Script.Leaderboard';
import { Image, Text } from 'UnityEngine.UI';
import ClientPlayer from './ClientPlayer';
import { GameObject } from 'UnityEngine';

export default class LeaderBoardManager extends ZepetoScriptBehaviour {

    // dl_game_system_dev 계정의 jumpworld에서 만듦
    private leaderboardId: string = "fd835bdf-8d22-427e-a726-e6c513719ecb";

    private score: number = 0;
    private hp: number = 100;
    private rank: string = " - ";
    public startRank: number = 0;
    public endRank: number;
    public resetRule: ResetRule;

    /* UI */
    public text_Hp: Text;
    public text_Score: Text;
    public text_Rank: Text;


    public playerScoreUIs: GameObject[];
    Start() {
  ;
        this.text_Hp.text = this.hp.toString();
        this.text_Score.text = this.score.toString();
        this.text_Rank.text = this.rank;
        LeaderboardAPI.GetRangeRank(this.leaderboardId, this.startRank, this.endRank, this.resetRule, false, ((result: GetRangeRankResponse) => {

            console.log(`result.isSuccess: ${result.isSuccess}`);
            if (result.rankInfo.myRank) {
                console.log(`my rank : ${result.rankInfo.myRank.rank.toString()}`);
                console.log(`member: ${result.rankInfo.myRank.member}, rank: ${result.rankInfo.myRank.rank}, score: ${result.rankInfo.myRank.score}, name: ${result.rankInfo.myRank.name}`);
                var resultInfo = result.rankInfo;
                this.rank = resultInfo.myRank.rank.toString();
                this.text_Rank.text = this.rank;
            }

            if (result.rankInfo.rankList) {
                for (let i = 0; i < result.rankInfo.rankList.length; ++i) {
                    var rank = result.rankInfo.rankList.get_Item(i);
                    console.log(`i: ${i}, member: ${rank.member}, rank: ${rank.rank}, score: ${rank.score}, name: ${result.rankInfo.myRank.name}`);
                }
            }
        }), this.OnError);
    }

    public AddLeaderBoardScore() {
        this.score += 1;
        // this.clientPlayer.OnPlayerGetScore();
        this.text_Score.text = this.score.toString();
        LeaderboardAPI.SetScore(this.leaderboardId, this.score, this.OnResult, this.OnError);

    }

    public ShowAllLeaderBoard() {
        LeaderboardAPI.GetAllLeaderboards(this.OnTotalResult, this.OnError);
    }

    public SubPlayerHP() {
        this.hp--;
        // console.log(`HP가 차감되었습니다 => ${this.hp}`);
        this.text_Hp.text = this.hp.toString();
    }

    /* callback functions */
    OnResult(result: SetScoreResponse) {
        console.log(`result.isSuccess: ${result.isSuccess}`);

    }

    OnTotalResult(result: GetAllLeaderboardsResponse) {
        console.log(`result.isSuccess: ${result.isSuccess}`);

        if (result.leaderboards) {
            for (let i = 0; i < result.leaderboards.length; ++i) {
                var leaderboard = result.leaderboards[i];
                console.log(`i: ${i}, id: ${leaderboard.id}, name: ${leaderboard.name}`);
            }
        }
    }

    OnRankResult(result: GetRangeRankResponse) {
        // console.log(`result.isSuccess: ${result.isSuccess}`);
        // if (result.rankInfo.myRank) {
        //     console.log(`my rank : ${result.rankInfo.myRank.rank.toString()}`);
        //     console.log(`member: ${result.rankInfo.myRank.member}, rank: ${result.rankInfo.myRank.rank}, score: ${result.rankInfo.myRank.score}, name: ${result.rankInfo.myRank.name}`);
        //     var resultInfo = result.rankInfo;
        //     this.rank = resultInfo.myRank.rank.toString();
        //     this.text_Rank.text += this.rank;
        // }

        // if (result.rankInfo.rankList) {
        //     for (let i = 0; i < result.rankInfo.rankList.length; ++i) {
        //         var rank = result.rankInfo.rankList.get_Item(i);
        //         console.log(`i: ${i}, member: ${rank.member}, rank: ${rank.rank}, score: 
        //         ${rank.score}, name: ${result.rankInfo.myRank.name}`);
        //     }
        // }
    }

    OnError(error: string) {
        console.error(error);
    }
}