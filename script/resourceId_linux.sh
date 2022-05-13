#!/bin/bash

if [ -z $1 ] || [ -z $2 ]
then
   echo Please specify User Email and Password
   exit 0
fi

email=$1
password=$2
host=http://localhost:3001

response=$(curl  -s -D - -o /dev/null "$host"/user/login -H 'Content-Type: application/json' --data '{"data": {"email" : "'$email'","password": "'$password'"}}'  | grep ^x-jwt-token*)
token=${response:13}
role_data=$(curl -H "x-jwt-token:${token//[$'\t\r\n ']}" -s  "$host"/role)

bkpIFS="$IFS"

IFS=',{}][' read -r -a array <<<"$role_data"

id=()
role=()
index=0
for i in "${array[@]}"
do
	if [ "${i:1:3}" == "_id" ]
	then
		id[$index]=${i:7:-1}
	elif [ "${i:1:5}" == "title" ]
	then
		role[$index]="${i:9:-1}"
		((index+=1))
	fi

done


user_data=$(curl -H "x-jwt-token:${token//[$'\t\r\n ']}" -s  "$host"/user)

bkpIFS="$IFS"

IFS=',{}][' read -r -a array <<<"$user_data"

for i in "${array[@]}"
do
	if [ "${i:1:3}" == "_id" ]
	then
		id[$index]=${i:7:-1}
	elif [ "${i:1:5}" == "title" ]
	then
		role[$index]="${i:9:-1}"
		((index+=1))
	fi

done

echo -------------------------------------------
echo Role Name       -          ID
echo -------------------------------------------
for i in $(seq 0 $index)
do
	key=$role[$i]
	val=$id[$i]
	echo "${role[$i]}"   -           "${id[$i]}"
done
echo -------------------------------------------
