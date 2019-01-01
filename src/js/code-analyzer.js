import * as esprima from 'esprima';
import * as escodegen from 'escodegen';


let OutputStringNodes ='';
export let OutputStringEdges='';
let GlobalCounterForNames=0;
export let FillEdges=false;
let FunctionMap=new Map();
let ToEval=true;
let WasReturnExpAlready=false;
export let FunctionParams =new Map();

FunctionMap.set('VariableDeclaration',LetHandler);
FunctionMap.set('ExpressionStatement',ExpHandler);
FunctionMap.set('IfStatement',IfHandler);
FunctionMap.set('WhileStatement',WhileHandler);
FunctionMap.set('ReturnStatement',ReturnHandler);

export function InitializeGlobalVariables(){
    OutputStringNodes='st=>start: Start\n';
    OutputStringEdges='st->';
    GlobalCounterForNames=0;
    FillEdges=false;
    FunctionParams=new Map();
    ToEval=true;
    WasReturnExpAlready=false;

}//tested

export function CreateFlowChartInputString(CodeToCFG,InputVector){
    CodeToCFG=esprima.parseScript(CodeToCFG);
    InitializeGlobalVariables();
    ExtractFunctionParams(CodeToCFG['body'][0],InputVector);//extract Params and their Values to List
    BodyHandler(CodeToCFG['body'][0]['body']);
    //return Variables;
    if(OutputStringEdges.charAt(OutputStringEdges.length-2)=='-' & OutputStringEdges.charAt(OutputStringEdges.length-1)=='>')
        OutputStringEdges=OutputStringEdges.substring(0,OutputStringEdges.length-2);
    return OutputStringNodes+OutputStringEdges;
}

export function ExtractFunctionParams(FunctionCode,InputVector) {//covered

    if (FunctionCode['params'].length != 0) {
        if (FunctionCode['params'].length == 1) {
            FunctionParams.set(FunctionCode['params'][0]['name'], InputVector);
        }
        else {
            let IV = esprima.parseScript(InputVector);
            IV = IV['body'][0]['expression']['expressions'];

            for (let i = 0; i < FunctionCode['params'].length; i = i + 1) {
                FunctionParams.set(FunctionCode['params'][i]['name'], escodegen.generate(IV[i]));
            }
        }
    }
}//tested


function LetHandler(LetExp){
    let paint='|approved';
    let StrLetExp=escodegen.generate(LetExp);
    StrLetExp=StrLetExp.replace(';','');
    StrLetExp=StrLetExp.replace('let','');
    if(ToEval & !WasReturnExpAlready)
        SubAndEvalLet(StrLetExp);
    else
        paint='';
    GlobalCounterForNames++;
    OutputStringNodes=OutputStringNodes+'op'+GlobalCounterForNames +'=>operation: #'+GlobalCounterForNames+'\n'+StrLetExp+paint+'\n';
    OutputStringEdges=OutputStringEdges+'op'+GlobalCounterForNames+'->';
    FillingEdges('op'+GlobalCounterForNames,FillEdges);
}

function ExpHandler(AssignmentExp){
    let paint ='|approved';
    let StrAssignmentExp=escodegen.generate(AssignmentExp);
    StrAssignmentExp=StrAssignmentExp.replace(';','');
    if(ToEval & !WasReturnExpAlready)
        SubAndEval(AssignmentExp);
    else
        paint='';
    GlobalCounterForNames++;
    OutputStringNodes=OutputStringNodes+'op'+GlobalCounterForNames+'=>operation: #'+GlobalCounterForNames+'\n'+StrAssignmentExp+paint+'\n';
    OutputStringEdges=OutputStringEdges+'op'+GlobalCounterForNames+'->';
    FillingEdges('op'+GlobalCounterForNames,FillEdges);
}

function ReturnHandler(ReturnExp){
    let paint='';
    if(ToEval){
        paint='|approved';
        WasReturnExpAlready=true;
    }
    let StrReturnExp=escodegen.generate(ReturnExp);
    StrReturnExp=StrReturnExp.replace('return','');
    GlobalCounterForNames++;
    OutputStringNodes=OutputStringNodes+'op'+ GlobalCounterForNames+'=>operation: #'+GlobalCounterForNames+'\n'+'return '+StrReturnExp+paint + '\n';
    OutputStringEdges=OutputStringEdges+'op'+GlobalCounterForNames+'->';
    FillingEdges('op'+GlobalCounterForNames,FillEdges);
}

function WhileHandler(WhileExp){
    ToEval=SubAndEvalPredicate(WhileExp);
    let paint='|approved';
    if(WasReturnExpAlready) paint='';
    GlobalCounterForNames++;
    let NullCounterName=GlobalCounterForNames;
    OutputStringNodes+='op'+ GlobalCounterForNames+'=>operation: #'+GlobalCounterForNames+'\n'+'NULL'+paint+'\n';
    OutputStringEdges+='op'+ GlobalCounterForNames+'->';
    FillingEdges('op'+GlobalCounterForNames,FillEdges);
    GlobalCounterForNames++;
    let WhileCounterName=GlobalCounterForNames;
    OutputStringNodes+='cond'+ GlobalCounterForNames+'=>condition: #'+GlobalCounterForNames+'\n'+escodegen.generate(WhileExp['test'])+paint+'\n';
    OutputStringEdges+='cond'+ GlobalCounterForNames;
    OutputStringEdges+='\n cond'+ GlobalCounterForNames+'(yes)->';//true edge
    BodyHandler(WhileExp['body']);
    OutputStringEdges=OutputStringEdges.substring(0,OutputStringEdges.length-2)+'(right)->op'+NullCounterName;
    OutputStringEdges+='\n cond'+ WhileCounterName+'(no,buttom)->';//false edge
    if(!WasReturnExpAlready) ToEval=true;
}

function IfHandler(IfExp){
    let paint='|approved';
    if(WasReturnExpAlready) paint='';
    ToEval=SubAndEvalPredicate(IfExp);
    GlobalCounterForNames++;
    let IfCounterName=GlobalCounterForNames;
    OutputStringNodes+='cond'+ GlobalCounterForNames+'=>condition: #'+GlobalCounterForNames+'\n'+escodegen.generate(IfExp['test'])+paint+'\n';
    FillingEdges('cond'+GlobalCounterForNames,FillEdges);
    OutputStringEdges+='cond'+ GlobalCounterForNames+'(yes)->';//true edge
    BodyHandler(IfExp['consequent']);
    OutputStringEdges+='@';//@ means to complete later
    OutputStringEdges+='\n cond'+ IfCounterName+'(no,right)->';//true edge
    if(IfExp['alternate']!==null){
        ToEval=!SubAndEvalPredicate(IfExp);
        if(IfExp['alternate']['type']==='IfStatement') StatementHandler(IfExp['alternate']);
        else ElseIfBodyHandler(IfExp['alternate']);
    }
    if(!WasReturnExpAlready) ToEval=true;
}

function BodyHandler(FunctionCode) {

    for(let i=0;i<FunctionCode['body'].length;i++){
        StatementHandler(FunctionCode['body'][i]);
        if(FunctionCode['body'][i]['type']==='IfStatement')
            FillEdges=true;
    }
}

function ElseIfBodyHandler(FunctionCode) {
    FillEdges=false;
    for(let i=0;i<FunctionCode['body'].length;i++){
        StatementHandler(FunctionCode['body'][i]);
    }
}

function StatementHandler(StatementExp){

    FunctionMap.get(StatementExp['type'])(StatementExp);
}

export function FillingEdges(nameOfNodeFiller,FillEdges){
    if(FillEdges){
        FillEdges=false;
        while(OutputStringEdges.indexOf('@')!=-1)
            OutputStringEdges=OutputStringEdges.replace('@',nameOfNodeFiller);
    }
}

export function SubAndEval(Exp) {
    if (Exp['expression']['type'] == 'AssignmentExpression') {
        let StrExp = escodegen.generate(Exp);
        let tmp = StrExp.split('=');

        let SubExp = Substitute(tmp[1].trim());
        let value = eval(Variables + SubExp);
        FunctionParams.set(tmp[0].trim(), value);//tmp[0] leftSide ,tmp[1] rightSide

    }
    else {
        if (Exp['expression']['type'] == 'UpdateExpression') {

            let StrExp = Exp['expression']['argument']['name'];
            FunctionParams.set(StrExp.trim(),FunctionParams.get(StrExp.trim())+1);//tmp[0] leftSide ,tmp[1] rightSide
        }
    }
}//tested

export function SubAndEvalLet(StrExp){
    let tmp=StrExp.split('=');
    let SubExp=Substitute(tmp[1].trim());
    let value=eval(Variables+SubExp);
    FunctionParams.set(tmp[0].trim(),value);//tmp[0] leftSide ,tmp[1] rightSide
}//tested

export function SubAndEvalPredicate(Exp){

    return eval(Variables+Substitute(escodegen.generate(Exp['test'])));//need to add
}//tested

export function Substitute(str){

    let iter = FunctionParams.keys();
    let key= iter.next().value;
    while(key!=undefined){
        if(str.includes(key)){
            str=str.split(key).join(FunctionParams.get(key));
        }
        key=iter.next().value;
    }
    return str;
}//tested

export function Variables(){
    let str='';
    let iter = FunctionParams.keys();
    let key= iter.next().value;
    while(key!=undefined){

        str=str+key+'='+FunctionParams.get(key)+';';
        key=iter.next().value;
    }
    return str;
}//tested