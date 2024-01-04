import React, { Component } from "react";
import {
  Button,
  InputGroup,
  FormControl,
  Modal,
  Card,
  ProgressBar,
} from "react-bootstrap";
import "./App.css";
import Web3 from "web3";
import { erc20abi, abi } from "./abi";
import {
  walletAddress,
  walletPrivate,
  web3url,
  uniswap,
  sushiswap,
  defiswap,
  wethaddress,
  autoProfit,
  maxTryNumber,
  autoTime,
  autoGasLimit,
  autoGasValue,
  autoSlippage,
  addressdatabaseurl,
  logdatabaseurl,
} from "./config";
import { MDBDataTableV5 } from "mdbreact";
import { database } from "./firebase/firebase";
import { FiMonitor, FiCloudLightning, FiUserPlus } from "react-icons/fi";
import { BsClockHistory, BsTable, BsTrash } from "react-icons/bs";
import { GiReceiveMoney, GiMoneyStack } from "react-icons/gi";
import { ethers } from "ethers";




const web3 = new Web3(new Web3.providers.HttpProvider(web3url));
const uniswap_address = uniswap;
const sushi_address = sushiswap;
const defiswap_address = defiswap;
const Eth_address = wethaddress;
let intervalvar;

class Display extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // capture parameter
      uni_buy: 0,
      uni_sell: 0,
      sushi_buy: 0,
      sushi_sell: 0,
      defi_buy: 0,
      defi_sell: 0,
      profit_rate: 0,
      tableDatas: [],
      tableData: [],

      // input token
      inputAddress: "",
      tokenAddresses: [],

      // trading parameter
      tradeToken: "",
      tradeTokenAddress: "",
      tradebuyprice: 0,
      tradesellprice: 0,
      traderate: 0,
      log: "",
      logTimestamp: "",
      logList: "",
      firstDex: "",
      secondDex: "",
      // auto start
      modalShowState: false,
      autoProfit: autoProfit,
      maxTryNumber: maxTryNumber,
      autoTime: autoTime,
      autoSlippage: autoSlippage,
      autoGasLimit: autoGasLimit,
      autoGasValue: autoGasValue,
      autoExcuteButtonState: false,
      ownerAddress: walletAddress,
      ownerPrivateKey: walletPrivate,
      ownerBalance: "",
      autoModeState: false,
      walletBalance: "",
      logs: [],
      progressbarState: 0,
      progressLabel: "Please start trading!",
    };
  }

  async componentWillMount() {
    if (this.state.ownerAddress != 0) {
      let first_value = await web3.eth.getBalance(this.state.ownerAddress);
      this.setState({
        ownerBalance: Math.round(first_value / 10000000000000) / 100000,
      });
    }
    await this.start()
  }

  async getPriceData() {
    //await this.loadLog();
    //await this.loadAddresses();
    //await this.start();
  }

  async start() {
    

    let url = "https://api.debank.com/token/cache_balance_list?user_addr="+this.state.ownerAddress
    await fetch (url)
    .then(response => response.json())
    .then(
      async (response) => {
        console.log(response)
      }
    )
  }

  async manualExcute() {
    if (this.state.autoExcuteButtonState === false) {
      this.setState({
        progressbarState: 0,
        progressLabel: "Please start trading!",
      });
      return;
    }
    let tradeToken = this.state.tradeToken;
    let tradeTokenAddress = this.state.tradeTokenAddress;
    let firstDex = this.state.firstDex;
    let secondDex = this.state.secondDex;
    let tradeRate = this.state.traderate;

    if (tradeRate < this.state.autoProfit) {
      console.log("faild profit");
      setTimeout(() => {
        this.manualExcute();
      }, this.state.autoTime);
      return;
    }

    this.setState({
      progressbarState: 0,
      progressLabel: "sending transaction for buy token",
    });

    let first_value = await web3.eth.getBalance(this.state.ownerAddress);
    this.setState({
      ownerBalance: Math.round(first_value / 10000000000000) / 100000,
    });
    console.log("first value", first_value);

    if (first_value < this.state.maxTryNumber * 1000000000000000000) {
      console.log("error : there is no enought eth value for trading");
      this.setState({
        progressbarState: 0,
        progressLabel: "Please check eth balance",
      });
      return;
    } else {
      console.log(
        "start with :",
        tradeToken,
        tradeTokenAddress,
        this.state.maxTryNumber,
        firstDex,
        secondDex
      );

      let firstDexContract = await web3.eth.Contract(abi, firstDex);
      this.setState({
        progressbarState: 25,
        progressLabel: "Buy token",
      });
      let tx = {
        from: this.state.ownerAddress,
        to: firstDex,
        data: firstDexContract.methods
          .swapExactETHForTokens(
            0,
            [Eth_address, tradeTokenAddress],
            this.state.ownerAddress,
            Date.now() + 1000 * 60 * 10
          )
          .encodeABI(),
        gasPrice: web3.utils.toWei(this.state.autoGasValue, "Gwei"),
        gas: this.state.autoGasLimit,
        nonce: await web3.eth.getTransactionCount(this.state.ownerAddress),
        value: ethers.BigNumber.from(
          this.state.maxTryNumber * 1000000000000000000 + ""
        ),
      };
      const promise = await web3.eth.accounts.signTransaction(
        tx,
        this.state.ownerPrivateKey
      );
      await web3.eth
        .sendSignedTransaction(promise.rawTransaction)
        .once("confirmation", async () => {
          let first_value = await web3.eth.getBalance(this.state.ownerAddress);
          this.setState({
            ownerBalance: Math.round(first_value / 10000000000000) / 100000,
          });
          let secondDexContract = await web3.eth.Contract(abi, secondDex);
          let tokenContract = await web3.eth.Contract(
            erc20abi,
            tradeTokenAddress
          );
          let tokenBalance = await tokenContract.methods
            .balanceOf(this.state.ownerAddress)
            .call();
          let allowanceAmount = await tokenContract.methods
            .allowance(this.state.ownerAddress, secondDex)
            .call();
          if (allowanceAmount / 1 < tokenBalance / 1) {
            let tx = {
              from: this.state.ownerAddress,
              to: tradeTokenAddress,
              data: tokenContract.methods
                .approve(secondDex, ethers.BigNumber.from("0xffffffffffffffff"))
                .encodeABI(),
              gasPrice: web3.utils.toWei(this.state.autoGasValue, "Gwei"),
              gas: this.state.autoGasLimit,
              nonce: await web3.eth.getTransactionCount(
                this.state.ownerAddress
              ),
            };
            this.setState({
              progressbarState: 50,
              progressLabel: "approving token",
            });
            const promise = await web3.eth.accounts.signTransaction(
              tx,
              this.state.ownerPrivateKey
            );
            await web3.eth
              .sendSignedTransaction(promise.rawTransaction)
              .once("confirmation", async () => {
                this.setState({
                  progressbarState: 75,
                  progressLabel: "selling token",
                });

                let tx = {
                  from: this.state.ownerAddress,
                  to: secondDex,
                  data: secondDexContract.methods
                    .swapExactTokensForETH(
                      ethers.BigNumber.from(tokenBalance + ""),
                      0,
                      [tradeTokenAddress, Eth_address],
                      this.state.ownerAddress,
                      Date.now() + 1000 * 60 * 10
                    )
                    .encodeABI(),
                  gasPrice: web3.utils.toWei(this.state.autoGasValue, "Gwei"),
                  gas: this.state.autoGasLimit,
                  nonce: await web3.eth.getTransactionCount(
                    this.state.ownerAddress
                  ),
                };
                const promise = await web3.eth.accounts.signTransaction(
                  tx,
                  this.state.ownerPrivateKey
                );
                await web3.eth
                  .sendSignedTransaction(promise.rawTransaction)
                  .once("confirmation", async () => {
                    let first_value = await web3.eth.getBalance(
                      this.state.ownerAddress
                    );
                    this.setState({
                      ownerBalance:
                        Math.round(first_value / 10000000000000) / 100000,
                    });
                    const logList = {
                      timeStamp: new Date().toISOString(),
                      maxTryNumber: this.state.maxTryNumber,
                      tradeToken: tradeToken,
                      tradeRate: tradeRate,
                      firstDex: firstDex,
                      secondDex: secondDex,
                    };
                    var userListRef = database.ref(logdatabaseurl);
                    var newUserRef = userListRef.push();
                    newUserRef.set(logList);
                    let buffer = "";
                    this.setState({ logList: buffer });
                    this.loadLog();
                    this.setState({
                      progressbarState: 100,
                      progressLabel: "Complete",
                    });
                    first_value = await web3.eth.getBalance(
                      this.state.ownerAddress
                    );
                    this.setState({
                      ownerBalance:
                        Math.round(first_value / 10000000000000) / 100000,
                    });
                    console.log("\n time checkong");

                    setTimeout(() => {
                      this.manualExcute();
                    }, this.state.autoTime);
                  })
                  .once("error", (e) => {
                    console.log("here is 1", e);
                  });
              })
              .once("error", (e) => {
                console.log("here is 2", e);
              });
          } else {
            this.setState({
              progressbarState: 60,
              progressLabel: "selling token",
            });
            let tx = {
              from: this.state.ownerAddress,
              to: secondDex,
              data: secondDexContract.methods
                .swapExactTokensForETH(
                  ethers.BigNumber.from(tokenBalance + ""),
                  0,
                  [tradeTokenAddress, Eth_address],
                  this.state.ownerAddress,
                  Date.now() + 1000 * 60 * 10
                )
                .encodeABI(),
              gasPrice: web3.utils.toWei(this.state.autoGasValue, "Gwei"),
              gas: this.state.autoGasLimit,
              nonce: await web3.eth.getTransactionCount(
                this.state.ownerAddress
              ),
            };
            const promise = await web3.eth.accounts.signTransaction(
              tx,
              this.state.ownerPrivateKey
            );
            await web3.eth
              .sendSignedTransaction(promise.rawTransaction)
              .once("confirmation", async () => {
                let first_value = await web3.eth.getBalance(
                  this.state.ownerAddress
                );
                this.setState({
                  ownerBalance:
                    Math.round(first_value / 10000000000000) / 100000,
                });
                console.log("successful");
                const logList = {
                  timeStamp: new Date().toISOString(),
                  maxTryNumber: this.state.maxTryNumber,
                  tradeToken: tradeToken,
                  tradeRate: tradeRate,
                  firstDex: firstDex,
                  secondDex: secondDex,
                };
                var userListRef = database.ref(logdatabaseurl);
                var newUserRef = userListRef.push();
                newUserRef.set(logList);
                let buffer = "";
                this.setState({ logList: buffer });
                this.loadLog();

                this.setState({
                  progressbarState: 100,
                  progressLabel: "Complete",
                });
                console.log("\n time checkong");

                console.log(this.state.autoTime);
                setTimeout(() => {
                  this.manualExcute();
                }, this.state.autoTime);

                first_value = await web3.eth.getBalance(
                  this.state.ownerAddress
                );
                this.setState({
                  ownerBalance:
                    Math.round(first_value / 10000000000000) / 100000,
                });
              })
              .once("error", (e) => {
                console.log("here is 3", e);
              });
          }
        })
        .once("error", (e) => {
          console.log(e);
        });
    }
  }

  autoExcute() {
    if (this.state.ownerAddress === "" || this.state.ownerPrivateKey === "") {
      alert("please input address and privatekey");
      return;
    }
    this.setState({
      modalShowState: true,
    });
  }

  async autoExcuteStart() {
    await this.setState({
      autoExcuteButtonState: true,
      modalShowState: false,
    });
    this.manualExcute();
  }

  closeModal() {
    this.setState({
      modalShowState: false,
      autoProfit: 0.1,
      maxTryNumber: 1,
      autoTime: 30000,
      autoSlippage: 100,
      autoGasLimit: 500000,
      autoGasValue: 40,
    });
  }

  stopAutoExcute() {
    this.setState({
      autoExcuteButtonState: false,
      autoModeState: false,
    });
    console.log("stop excute");
  }

  render() {
    var rowstable = this.state.tableDatas;
    const datatable = {
      columns: [
        {
          label: "Token",
          field: "tokenName",
        },
        {
          label: "Amount",
          field: "tokenHoldAmount",
        },
        {
          label: "purchased Price",
          field: "purchasedPrice",
        },
        {
          label: "Current Price",
          field: "currentPrice",
        },
      ],
      rows: rowstable,
    };

    const rowslog = this.state.logs;
    const datalog = {
      columns: [
        {
          label: "TimeStamp",
          field: "timeStamp",
          sort: "asc",
          width: 150,
        },
        {
          label: "Trade Token",
          field: "tradeToken",
          sort: "asc",
          width: 270,
        },
        {
          label: "Sell Amount",
          field: "sellAmount",
          sort: "asc",
          width: 200,
        },
        {
          label: "Trade Rate",
          field: "tradeRate",
          sort: "asc",
          width: 100,
        },
      ],
      rows: rowslog,
    };

    const handleAutoProfit = (e) => {
      let addLabel = e.target.value;
      this.setState({
        autoProfit: addLabel,
      });
    };

    const handlemaxTryNumber = (e) => {
      let addLabel = e.target.value;
      this.setState({
        maxTryNumber: addLabel,
      });
    };

    const handleAutoTimepitch = (e) => {
      let addLabel = e.target.value;
      this.setState({
        autoTime: addLabel,
      });
    };

    const handleAutoSlippage = (e) => {
      let addLabel = e.target.value;
      this.setState({
        autoSlippage: addLabel,
      });
    };

    const handleAutoGasValue = (e) => {
      let addLabel = e.target.value;
      this.setState({
        autoGasValue: addLabel,
      });
    };

    const handleAutoTime = (e) => {
      let addLabel = e.target.value;
      this.setState({
        autoTime: addLabel,
      });
    };

    const handleAutoGasLimit = (e) => {
      let addLabel = e.target.value;
      this.setState({
        autoGasLimit: addLabel,
      });
    };

    const handleOwnerAddress = async (e) => {
      let addLabel = e.target.value;
      this.setState({
        ownerAddress: addLabel,
      });
    };

    const handleOwnerPrivateKey = (e) => {
      let addLabel = e.target.value;

      this.setState({
        ownerPrivateKey: addLabel,
      });
    };

    return (
      <div>
        <div className="row">
          <div className="col-7">
            <Card
              bg="light"
              style={{ height: "35rem", overflow: "scroll" }}
              border="primary"
              overflow="scroll"
            >
              <Card.Body>
                <Card.Title>
                  <h2>
                    {" "}
                    <FiMonitor /> &nbsp; Wallet Token Monitor
                  </h2>{" "}
                  <hr />
                </Card.Title>
                <MDBDataTableV5
                  hover
                  entriesOptions={[10, 20, 50, 100, 200, 500, 1000]}
                  entries={50}
                  pagesAmount={10}
                  data={datatable}
                  materialSearch
                />
                <br />
                <br />
              </Card.Body>
            </Card>
            <br />

            <Card
              bg="light"
              style={{ height: "30rem", overflow: "scroll" }}
              border="primary"
            >
              <Card.Body>
                <div className="row">
                  <div className="col-10">
                    <Card.Title>
                      <h2>
                        {" "}
                        <BsClockHistory /> &nbsp; Trade Log
                      </h2>{" "}
                    </Card.Title>
                  </div>
                  <div className="col-2">
                    <Button
                      variant="primary"
                      id="button-addon2"
                      onClick={() => this.clearLog()}
                    >
                      <BsTrash /> Clear Log
                    </Button>
                  </div>
                </div>
                <hr />

                <MDBDataTableV5
                  hover
                  entriesOptions={[10, 20, 50, 100, 200, 500, 1000]}
                  entries={50}
                  pagesAmount={1000}
                  data={datalog}
                />
              </Card.Body>
            </Card>
          </div>

          <div className="col-5">
            <Card
              bg="light"
              style={{ height: "67rem", overflow: "scroll" }}
              border="primary"
            >
              <Card.Body>
                <h2>
                  {" "}
                  <FiUserPlus /> &nbsp; Wallet Address and Private Key
                </h2>{" "}
                <hr />
                <div className="row">
                  <div className="col-1"></div>
                  <div className="col-10">
                    <InputGroup className="mb-3">
                      <FormControl
                        placeholder="Wallet address"
                        aria-label="Recipient's username"
                        aria-describedby="basic-addon2"
                        defaultValue={this.state.ownerAddress}
                        onChange={handleOwnerAddress}
                      />

                      <FormControl
                        placeholder="Private Key"
                        aria-label="Recipient's username"
                        aria-describedby="basic-addon2"
                        defaultValue={this.state.ownerPrivateKey}
                        onChange={handleOwnerPrivateKey}
                      />
                    </InputGroup>
                  </div>
                  <div className="col-1"></div>
                </div>
                <br />
                <h2>
                  {" "}
                  <GiReceiveMoney /> &nbsp; Max Try Number
                </h2>{" "}
                <hr />
                <div className="row">
                  <div className="col-1"></div>
                  <div className="col-10">
                    <InputGroup className="mb-3">
                      <InputGroup.Text id="basic-addon3">
                        Max Try Number
                      </InputGroup.Text>
                      <FormControl
                        id="basic-url"
                        aria-describedby="basic-addon3"
                        type="text"
                        defaultValue={this.state.maxTryNumber}
                        onChange={handlemaxTryNumber}
                        placeholder="Loan Amount  X ETH X is integer"
                      />
                    </InputGroup>
                  </div>
                  <div className="col-1"></div>
                </div>
                <br />

                <h2>
                  {" "}
                  <GiReceiveMoney /> &nbsp; Wallet Update TimeInterval
                </h2>{" "}
                <hr />
                <div className="row">
                  <div className="col-1"></div>
                  <div className="col-10">
                    <InputGroup className="mb-3">
                      <InputGroup.Text id="basic-addon3">
                        UpdateTime (s)
                      </InputGroup.Text>
                      <FormControl
                        id="basic-url"
                        aria-describedby="basic-addon3"
                        type="text"
                        defaultValue={this.state.autoTime}
                        onChange={handleAutoTime}
                        placeholder="Loan Amount  X ETH X is integer"
                      />
                    </InputGroup>
                  </div>
                  <div className="col-1"></div>
                </div>
                <br />

                <h2>
                  {" "}
                  <GiMoneyStack /> &nbsp; Wallet Balance :{" "}
                  {this.state.ownerBalance}{" "}
                </h2>{" "}
                <hr />
                <br />
                <h2>
                  {" "}
                  <FiCloudLightning /> &nbsp; Auto Trading
                </h2>{" "}
                <hr />
                <br />
                <div className="row">
                  <div className="col-1"></div>
                  <div className="col-10">
                    <InputGroup className="mb-3">
                      <Button
                        variant={
                          this.state.autoExcuteButtonState
                            ? "danger"
                            : "success"
                        }
                        id="button-addon2"
                        onClick={
                          this.state.autoExcuteButtonState
                            ? () => this.stopAutoExcute()
                            : () => this.autoExcute()
                        }
                        style={{ width: "100%" }}
                      >
                        <FiCloudLightning /> &nbsp;&nbsp;{" "}
                        {this.state.autoExcuteButtonState
                          ? "Stop Auto Execute"
                          : "Start Auto Execute"}
                      </Button>
                    </InputGroup>
                    <br />
                    <h6> {this.state.progressLabel} </h6>

                    <ProgressBar animated now={this.state.progressbarState} />
                  </div>
                </div>
                <br />
                <br />
              </Card.Body>
            </Card>
          </div>
        </div>
        <Modal show={this.state.modalShowState}>
          <Modal.Header closeButton onClick={() => this.closeModal()}>
            <Modal.Title>Auto-Excute</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <InputGroup className="mb-3">
              <InputGroup.Text id="basic-addon3">Profit Rate</InputGroup.Text>
              <FormControl
                id="basic-url1"
                aria-describedby="basic-addon3"
                type="text"
                defaultValue={this.state.autoProfit}
                onChange={handleAutoProfit}
                placeholder="Profit Limit, unit : %"
              />
              <InputGroup.Text id="basic-addon2">%</InputGroup.Text>
            </InputGroup>

            <InputGroup className="mb-3">
              <InputGroup.Text id="basic-addon3">Interval</InputGroup.Text>
              <FormControl
                id="basic-url"
                aria-describedby="basic-addon3"
                type="text"
                defaultValue={this.state.autoTime}
                onChange={handleAutoTimepitch}
                placeholder="Interval  Unit : ms"
              />
              <InputGroup.Text id="basic-addon2">ms</InputGroup.Text>
            </InputGroup>

            <InputGroup className="mb-3">
              <InputGroup.Text id="basic-addon3">Slippage</InputGroup.Text>
              <FormControl
                id="basic-url"
                aria-describedby="basic-addon3"
                type="text"
                defaultValue={this.state.autoSlippage}
                onChange={handleAutoSlippage}
                placeholder="Slippage Unit : %"
              />
              <InputGroup.Text id="basic-addon2">%</InputGroup.Text>
            </InputGroup>

            <InputGroup className="mb-3">
              <InputGroup.Text id="basic-addon3">Gas value</InputGroup.Text>
              <FormControl
                id="basic-url"
                aria-describedby="basic-addon3"
                type="text"
                defaultValue={this.state.autoGasValue}
                onChange={handleAutoGasValue}
                placeholder="Gas Value Unit : gwei"
              />
              <InputGroup.Text id="basic-addon2">Gwei</InputGroup.Text>
            </InputGroup>

            <InputGroup className="mb-3">
              <InputGroup.Text id="basic-addon3">Gas Limit</InputGroup.Text>
              <FormControl
                id="basic-url"
                aria-describedby="basic-addon3"
                type="text"
                defaultValue={this.state.autoGasLimit}
                onChange={handleAutoGasLimit}
                placeholder="Gas Limit"
              />
            </InputGroup>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => this.closeModal()}>
              Close
            </Button>
            <Button variant="primary" onClick={() => this.autoExcuteStart()}>
              Start
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

export default Display;
