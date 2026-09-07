// Strudel File
// Steppin' out, Joe Jackson
setcpm(20)
bd_snare: s("[bd!2, ~ sd]*4").bank("bossdr110").gain(.4)
hh: s("hh!8").bank("ace").hpf(10000).gain(.4)
bass: note("d2!4 g1!2 a1!2 d2!2 a1!2 g1!2 a1!2 ").velocity(.7).sound("gm_fretless_bass").gain(1.2)

