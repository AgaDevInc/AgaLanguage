const data = '¡\x93¨¬«§5£·±¦È²»¼J·Î¹×âÙáqÒÐêÕ}týT|~èúûĂć\x8CāĀďĒ\x98Ó\x9CĈćĶċÎĻĺĸĠņÕÖØÞö§ÙÜņŗŘšŤêŦřŬŲũŵûĠÿŠŤıíĊĎźƓƘĖĭƘƒƧĭƞıŗĶŌśļƯłŲņƻƺǈǍţǇǀǎǈǚǎƘŤǖƂƄƄŕųŵŷŹȀǨȒȖȂșƱșȢȢȋƴǶȬȬȣȬȦǍȩȻȸȸǼȷȱɈȅɉȾɁǤɞɄɥɨɚȤɩɳȃȅɰɯɽʂɥɹɬȟɸʁɺʑɚʒʇʋɠʢȲȾȷȽʡȿɇʿʼʑˆˆʽˆʿɪʂɰɲɴɷʏɀɳɶ˲˚˹˽˻˹ʅ̃˩̈̍̄̐ʨ̉̑̍̔ʬʭʯʾ˖ʒ͂';

function decrypt(data: string) {
  const list = data.split('');
  const result = [];
  for (let i = 0; i < list.length; i++)
    result.push(String.fromCharCode(parseInt(''+(list[i].charCodeAt(0)), 9)-i));
  return result.join('');
}