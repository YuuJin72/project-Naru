import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { ReactComponent as Logo } from "../../assets/images/logo01.svg";
import Button01 from "../../components/common/button/Button01";
import Input01 from "../../components/common/input/Input01";
import './SignUp.scss';
import axios from 'axios';
import {Modal} from './../../components/common/modal/modal';

const SignUp = () => {
    const navigate = useNavigate();
    const {Success, Warning, Failure} = Modal();


    const emailPattern = "[a-zA-Z0-9]+[@][a-zA-Z0-9]+[.]+[a-zA-Z]+[.]*[a-zA-Z]*";
    const nicknamePattern = "^(?=.*[a-z0-9가-힣])[a-z0-9가-힣]{2,16}$";
    const passwordPattern = "[0-9]{12,64}$";


    const [Inputs, setInputs] = useState({
        email: "",
        authNum: 0,
        nickname: "",
        password: 0,
        passwordCheck: 0,
        emailCheck: "false",
        authCheck: "false"
        });

    const onChangeInputs = (id) => (e) => {
        setInputs({
        ...Inputs,
        [id]: e.target.value
        });
    };

    const onInvalid = (text) => (e) => {
        e.target.setCustomValidity(text);
    }

    const onInput = (e) => {
        e.target.setCustomValidity('');
    }

    const onClickEmailCheck = () => {
        axios.post("http://localhost:8080/signup/mail", {
            req: "email",
            email: Inputs.email
        })
        .then((response) => {
            if(response.data.message === "인증메일이 발송되었습니다.") {
                Success("인증메일 발송", response.data.message)
                setInputs({ ...Inputs, emailCheck : "true"});
            } else {
                Warning("인증메일 발송 실패", response.data.message)
            }

        }).catch((error) => {
            Failure("인증메일 발송 실패", "인증메일 발송에 실패했습니다.")
        })
    }

    const onClickAuth = () => {
        console.log("보낸거",Inputs.authNum)
        axios.post("http://localhost:8080/signup/auth", {
            email: Inputs.email,
            authNum: Inputs.authNum
        })
        .then((response) => {
            if(response.data.message === "인증되었습니다.") {
                Success("인증 확인",response.data.message);
                setInputs({ ...Inputs, authCheck : "true"});
            } else {
                Warning("인증 실패", response.data.message);
            }
        }).catch((error) => {
            Failure("인증 실패", "인증에 실패했습니다.")
        })
    }

    const onClickSignUp = () => {
        if(Inputs.password === Inputs.passwordCheck && Inputs.emailCheck === "true" && Inputs.authCheck === "true") {
            axios.post("http://localhost:8080/signup", {
                email: Inputs.email,
                nickname: Inputs.nickname,
                password: Inputs.password
            })
            .then((response) => {
                if(response.data.message === "가입되었습니다.🎉") {
                    Success("가입 성공", response.data.message);
                    navigate('/signIn')
                }
                else {
                    Warning("가입 실패", response.data.message);
                }
            }).catch((error) => {
                Failure("가입 실패", "회원가입에 실패했습니다.")
            })
        }
        else {
            Failure("가입 실패", "회원가입에 실패했습니다.")
        }
    }


    return (
        <div className="signUp">
            <form className="signUp-wrapper">
                <Logo height="55" role="img"/>
                    <div className="signUp__auth">
                    <Input01 type={"text"} placeholder={"이메일"} size={"s"} onChange={onChangeInputs("email")} required
                    pattern={emailPattern} title={"ex) naru@naru.com"} onInvalid={onInvalid("이메일을 입력해주세요.")} onInput={onInput}/>
                    <Button01 type="button" text={"인증메일 발송"} size={"m"} onClick={onClickEmailCheck} />
                    </div>

                    <div className="signUp__auth">
                        <Input01 type={"number"} placeholder={"인증번호"} size={"s"} onChange={onChangeInputs("authNum")}/>
                        <Button01 type="button" text={"인증번호 확인"} size={"m"} onClick={onClickAuth} />
                    </div>

                    <Input01 type={"text"} placeholder={"닉네임 (한글,영문,숫자 포함 2~8자)"} size={"m"} onChange={onChangeInputs("nickname")} required
                    pattern={nicknamePattern} title={"한글,영문,숫자 포함 2~8자"} onInvalid={onInvalid('닉네임을 입력해주세요.')} onInput={onInput}/>

                    <Input01 type={"password"} placeholder={"비밀번호 (숫자 12~64자)"} size={"m"} onChange={onChangeInputs("password")} required
                    pattern={passwordPattern} title={"숫자 12자~64자"} onInvalid={onInvalid('비밀번호를  입력해주세요.')} onInput={onInput}/>
                    <Input01 type={"password"} placeholder={"비밀번호 확인 (숫자 12~64자)"} size={"m"} onChange={onChangeInputs("passwordCheck")} required
                    pattern={passwordPattern} title={"숫자 12자~64자"} onInvalid={onInvalid('비밀번호를 한번 더 입력해주세요.')} onInput={onInput} />

                    <Button01 type="button" text={"회원가입"} size={"m"} onClick={onClickSignUp}/>
            </form>
        </div>
    );
};

export default SignUp;